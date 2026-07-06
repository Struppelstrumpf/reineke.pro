'use strict';

/**
 * Weißer Schäfer – kleines Datei-Datenbank-Backend.
 *
 * Speichert die Anwendungsdaten als JSON-Dokumente (Key → serialisierter Wert)
 * in EINER Datei. Atomare Writes (temp + rename) und eine serialisierte
 * Write-Queue verhindern korrupte Dateien. Keine externen Abhängigkeiten.
 *
 * Endpunkte:
 *   GET  /api/health            → { ok: true }
 *   GET  /api/state             → { values: { <key>: <jsonString> } }
 *   GET  /api/state/:key        → { value: <jsonString|null> }
 *   PUT  /api/state/:key        → Body { value: <jsonString> } → { ok: true }
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { handleFusswerkBooking } = require('./fusswerk-booking');

const PORT = Number(process.env.PORT) || 19290;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const NASEBAER_FRONTEND_ORIGIN = (process.env.NASEBAER_FRONTEND_ORIGIN || 'http://localhost:4200').replace(
  /\/$/,
  '',
);
const DISCORD_REDIRECT_URI =
  process.env.DISCORD_REDIRECT_URI || `http://localhost:${PORT}/api/auth/discord/callback`;
const DATA_FILE = process.env.WS_DATA_FILE || '/data/ws-store.json';
const MAX_VALUE_BYTES = 8 * 1024 * 1024; // 8 MB pro Wert
const MAX_BODY_BYTES = 12 * 1024 * 1024;

/** In-Memory-Spiegel der Datei: { [key]: { value, updatedAt } } */
let store = {};
/** Promise-Kette: serialisiert alle Schreibvorgänge. */
let writeChain = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

async function loadStore() {
  try {
    const raw = await fsp.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      store = parsed;
    }
  } catch (err) {
    if (err && err.code !== 'ENOENT') {
      console.error('[ws-backend] Konnte Datendatei nicht lesen:', err.message);
    }
    store = {};
  }
}

async function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  await fsp.mkdir(dir, { recursive: true }).catch(() => {});
}

/** Schreibt den kompletten Store atomar (temp-Datei + rename). */
function persistStore() {
  writeChain = writeChain.then(async () => {
    const tmp = `${DATA_FILE}.${process.pid}.tmp`;
    const payload = JSON.stringify(store);
    await fsp.writeFile(tmp, payload, 'utf8');
    await fsp.rename(tmp, DATA_FILE);
  });
  return writeChain.catch((err) => {
    console.error('[ws-backend] Schreibfehler:', err.message);
  });
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-ws-token, Authorization',
    'Cache-Control': 'no-store',
  });
  res.end(data);
}

function sendRedirect(res, location) {
  res.writeHead(302, {
    Location: location,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end();
}

function httpsRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let parsed = text;
          try {
            parsed = JSON.parse(text);
          } catch {
            // Rohtext beibehalten
          }
          resolve({ status: response.statusCode || 0, body: parsed });
        });
      },
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Body zu groß'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function allValues() {
  const values = {};
  for (const key of Object.keys(store)) {
    const entry = store[key];
    if (entry && typeof entry.value === 'string') {
      values[key] = entry.value;
    }
  }
  return values;
}

/** Liest einen gespeicherten Wert als geparstes JSON (oder null). */
function readDoc(key) {
  const entry = store[key];
  if (!entry || typeof entry.value !== 'string') {
    return null;
  }
  try {
    return JSON.parse(entry.value);
  } catch {
    return null;
  }
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

function bearerToken(req) {
  const raw = req.headers.authorization || req.headers.Authorization || '';
  const v = typeof raw === 'string' ? raw : '';
  if (v.toLowerCase().startsWith('bearer ')) return v.slice(7).trim();
  return null;
}

function readSession(token) {
  if (!token || token.length < 32) return null;
  const doc = readDoc(`nb-session:${token}`);
  if (!doc || !doc.user || !doc.expiresAt) return null;
  if (new Date(doc.expiresAt) < new Date()) {
    delete store[`nb-session:${token}`];
    return null;
  }
  return doc;
}

const SCRYPT_KEYLEN = 64;
const PASSWORD_MIN_LEN = 10;
const loginAttempts = new Map();

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function checkLoginRate(ip) {
  const now = Date.now();
  let entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + 60_000 };
  }
  entry.count += 1;
  loginAttempts.set(ip, entry);
  return entry.count <= 10;
}

function normalizeEmail(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

function passwordValidationError(password) {
  if (password.length < PASSWORD_MIN_LEN) {
    return `Passwort mindestens ${PASSWORD_MIN_LEN} Zeichen`;
  }
  if (!/[A-Z]/.test(password)) return 'Mindestens ein Großbuchstabe';
  if (!/[a-z]/.test(password)) return 'Mindestens ein Kleinbuchstabe';
  if (!/[0-9]/.test(password) && !/[^A-Za-z0-9]/.test(password)) {
    return 'Mindestens eine Zahl oder ein Sonderzeichen';
  }
  return null;
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
}

function verifyPassword(password, salt, hash) {
  try {
    const candidate = hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

function emailUserId(email) {
  return `email-${crypto.createHash('sha256').update(email).digest('hex').slice(0, 20)}`;
}

function readEmailUser(email) {
  return readDoc(`nb-user:${email}`);
}

function findAccountById(userId) {
  for (const key of Object.keys(store)) {
    if (!key.startsWith('nb-user:')) continue;
    const u = readDoc(key);
    if (u && u.id === userId) {
      return { emailKey: key.slice('nb-user:'.length), ...u };
    }
  }
  return null;
}

function userPublicFromAccount(account) {
  if (!account) return null;
  return {
    id: account.id,
    name: account.name || 'Nasebär',
    avatarUrl: account.avatarUrl || '',
  };
}

const SHARE_DURATION_MS = 20 * 60 * 1000;
const DEFAULT_SHARE_RADIUS_KM = 5;

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function readSocial(userId) {
  const doc = readDoc(`nb-social:${userId}`);
  if (!doc) return { friends: [], requestsIn: [], requestsOut: [] };
  return {
    friends: Array.isArray(doc.friends) ? doc.friends : [],
    requestsIn: Array.isArray(doc.requestsIn) ? doc.requestsIn : [],
    requestsOut: Array.isArray(doc.requestsOut) ? doc.requestsOut : [],
  };
}

function writeSocial(userId, doc) {
  writeDoc(`nb-social:${userId}`, doc);
}

function readDogs(userId) {
  const dogs = readDoc(`nb-dogs:${userId}`);
  return Array.isArray(dogs) ? dogs : [];
}

function readNotifs(userId) {
  const list = readDoc(`nb-notifications:${userId}`);
  return Array.isArray(list) ? list : [];
}

function addNotif(userId, payload) {
  const list = readNotifs(userId);
  const item = {
    id: randomToken().slice(0, 12),
    read: false,
    createdAt: nowIso(),
    ...payload,
  };
  list.unshift(item);
  writeDoc(`nb-notifications:${userId}`, list.slice(0, 80));
  return item;
}

function cleanExpiredShares() {
  const now = Date.now();
  for (const key of Object.keys(store)) {
    if (!key.startsWith('nb-share:')) continue;
    const doc = readDoc(key);
    if (!doc || new Date(doc.expiresAt).getTime() <= now) delete store[key];
  }
}

function activeShares() {
  cleanExpiredShares();
  const out = [];
  for (const key of Object.keys(store)) {
    if (!key.startsWith('nb-share:')) continue;
    const userId = key.slice('nb-share:'.length);
    const doc = readDoc(key);
    if (doc) out.push({ userId, ...doc });
  }
  return out;
}

function readMeetups(userId) {
  const list = readDoc(`nb-meetups:${userId}`);
  return Array.isArray(list) ? list : [];
}

function writeMeetups(userId, list) {
  writeDoc(`nb-meetups:${userId}`, list);
}

function appendMeetupForUsers(userIds, meetup) {
  const seen = new Set();
  for (const uid of userIds) {
    if (!uid || seen.has(uid)) continue;
    seen.add(uid);
    const list = readMeetups(uid);
    list.unshift(meetup);
    writeMeetups(uid, list.slice(0, 40));
  }
}

function readSpotSocial(spotId) {
  const doc = readDoc(`nb-spot-social:${spotId}`);
  if (!doc) return { comments: [], upvotes: [], downvotes: [] };
  return {
    comments: Array.isArray(doc.comments) ? doc.comments : [],
    upvotes: Array.isArray(doc.upvotes) ? doc.upvotes : [],
    downvotes: Array.isArray(doc.downvotes) ? doc.downvotes : [],
  };
}

function writeSpotSocial(spotId, doc) {
  writeDoc(`nb-spot-social:${spotId}`, doc);
}

const SPOT_REPORT_BLOCK_COUNT = 3;

function readSpotReports(spotId) {
  const doc = readDoc(`nb-spot-reports:${spotId}`);
  if (!doc) return { reporters: [], blocked: false, blockedAt: null };
  return {
    reporters: Array.isArray(doc.reporters) ? doc.reporters : [],
    blocked: Boolean(doc.blocked),
    blockedAt: doc.blockedAt || null,
  };
}

function writeSpotReports(spotId, doc) {
  writeDoc(`nb-spot-reports:${spotId}`, doc);
}

function readBlockedSpotIds() {
  const list = readDoc('nb-spots-blocked');
  return Array.isArray(list) ? list : [];
}

function isSpotBlocked(spotId) {
  if (readBlockedSpotIds().includes(spotId)) return true;
  return readSpotReports(spotId).blocked;
}

function markSpotBlocked(spotId) {
  const list = readBlockedSpotIds();
  if (!list.includes(spotId)) {
    writeDoc('nb-spots-blocked', [...list, spotId]);
  }
  const reports = readSpotReports(spotId);
  if (!reports.blocked) {
    writeSpotReports(spotId, { ...reports, blocked: true, blockedAt: nowIso() });
  }
}

function spotSocialPayload(doc, userId) {
  const upvotes = doc.upvotes || [];
  const downvotes = doc.downvotes || [];
  let userVote = null;
  if (userId) {
    if (upvotes.includes(userId)) userVote = 'up';
    else if (downvotes.includes(userId)) userVote = 'down';
  }
  return {
    comments: doc.comments || [],
    upvotes,
    downvotes,
    score: upvotes.length - downvotes.length,
    userVote,
  };
}

function readAllPins() {
  const list = readDoc('nb-pins-all');
  return Array.isArray(list) ? list : [];
}

function writeAllPins(list) {
  writeDoc('nb-pins-all', list);
}

function requireAuth(req) {
  const token = bearerToken(req);
  const session = readSession(token);
  if (!session) return null;
  return session;
}

async function issueSession(user) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  writeDoc(`nb-session:${token}`, { user, expiresAt, createdAt: nowIso() });
  await persistStore();
  return { token, user };
}

const oauthStates = new Map();

function discordConfigured() {
  return Boolean(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET);
}

function storeOAuthState(state, data) {
  oauthStates.set(state, { ...data, expiresAt: Date.now() + 10 * 60 * 1000 });
}

function consumeOAuthState(state) {
  const entry = oauthStates.get(state);
  oauthStates.delete(state);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry;
}

function demoUser(provider) {
  const profiles = {
    google: { name: 'Google-Nase', email: 'nase@google.demo' },
  };
  const p = profiles[provider] || profiles.google;
  const id = `demo-${provider}-stable`;
  return { id, name: p.name, email: p.email, avatarUrl: '', provider };
}

function writeDoc(key, doc) {
  store[key] = { value: JSON.stringify(doc), updatedAt: nowIso() };
}

function agentToken() {
  const raw = readDoc('ws-agent-token');
  return typeof raw === 'string' ? raw.trim() : '';
}

function requestToken(req, url) {
  const header = req.headers['x-ws-token'];
  if (typeof header === 'string' && header.trim()) {
    return header.trim();
  }
  return (url.searchParams.get('token') || '').trim();
}

// --- Lagerwarn-Logik (gespiegelt aus der Web-App) ----------------------------

function normalizeAlertTime(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value).trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function normalizeAlertTimes(values) {
  const set = new Set();
  for (const v of values || []) {
    const n = normalizeAlertTime(v);
    if (n) set.add(n);
  }
  return [...set].sort();
}

function alertSlotKey(date, time) {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}:${time}`;
}

function slotDateTime(date, time) {
  const [h, m] = time.split(':').map(Number);
  const slot = new Date(date);
  slot.setHours(h, m, 0, 0);
  return slot;
}

function dueUnprintedSlots(alertTimes, printedSlots, now) {
  const normalized = normalizeAlertTimes(alertTimes);
  if (!normalized.length) return [];
  const printed = new Set(printedSlots || []);
  const due = [];
  for (const time of normalized) {
    if (now.getTime() < slotDateTime(now, time).getTime()) continue;
    if (!printed.has(alertSlotKey(now, time))) due.push(time);
  }
  return due;
}

function buildStockAlert(now) {
  const inventory = readDoc('ws-demo-inventory');
  if (!inventory || !inventory.settings || !inventory.settings.alertsEnabled) {
    return null;
  }
  const stock = inventory.stock || {};
  const catalog = readDoc('ws-demo-catalog');
  const products = (catalog && Array.isArray(catalog.products)) ? catalog.products : [];
  const byId = new Map(products.map((p) => [p.id, p]));

  const items = [];
  for (const productId of Object.keys(stock)) {
    const entry = stock[productId] || {};
    const quantity = Number(entry.quantity) || 0;
    const threshold = Number(entry.alertThreshold) || 0;
    if (quantity > threshold) continue;
    const product = byId.get(productId);
    if (!product || product.active === false) continue;
    items.push({
      productId,
      productName: product.name || productId,
      spec: product.spec || '',
      unit: product.unit || '',
      quantity,
      threshold,
    });
  }
  if (!items.length) return null;

  const due = dueUnprintedSlots(
    inventory.settings.alertTimes,
    inventory.settings.printedAlertSlots,
    now,
  );
  if (!due.length) return null;

  return { items, slots: due.map((time) => alertSlotKey(now, time)) };
}

function orderPrintPayloads() {
  const orders = readDoc('ws-demo-orders');
  if (!Array.isArray(orders)) return [];
  return orders
    .filter((o) => o && o.status === 'neu' && !o.printedAt)
    .map((o) => ({
      orderId: o.id,
      jobId: `cloud-${o.id}`,
      customer: o.customer,
      customerAddress: o.customerAddress,
      customerPhone: o.customerPhone,
      createdAt: o.createdAt,
      lines: o.lines || [],
      note: o.note,
    }));
}

function markOrdersPrinted(orderIds) {
  const ids = new Set(orderIds || []);
  if (!ids.size) return;
  const orders = readDoc('ws-demo-orders');
  if (!Array.isArray(orders)) return;
  const stamp = nowIso();
  let changed = false;
  const next = orders.map((o) => {
    if (!o || !ids.has(o.id) || o.printedAt) return o;
    changed = true;
    return {
      ...o,
      status: o.status === 'neu' ? 'in Bearbeitung' : o.status,
      printedAt: stamp,
      printState: 'printed',
      printingSince: undefined,
      printDispatchedAt: undefined,
    };
  });
  if (changed) writeDoc('ws-demo-orders', next);
}

function markStockSlotsPrinted(slots) {
  if (!slots || !slots.length) return;
  const inventory = readDoc('ws-demo-inventory');
  if (!inventory || !inventory.settings) return;
  const printed = new Set(inventory.settings.printedAlertSlots || []);
  for (const s of slots) printed.add(s);
  const next = {
    ...inventory,
    settings: {
      ...inventory.settings,
      printedAlertSlots: [...printed],
      lastCombinedAlertAt: nowIso(),
    },
  };
  writeDoc('ws-demo-inventory', next);
}

const server = http.createServer(async (req, res) => {
  const method = req.method || 'GET';
  const url = new URL(req.url || '/', 'http://localhost');
  let pathname = '/';
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    pathname = url.pathname || '/';
  }

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-ws-token, Authorization',
    });
    res.end();
    return;
  }

  if (method === 'GET' && (pathname === '/' || pathname === '/api/health')) {
    sendJson(res, 200, { ok: true, service: 'ws-backend', keys: Object.keys(store).length });
    return;
  }

  if (method === 'GET' && pathname === '/api/state') {
    sendJson(res, 200, { values: allValues(), updatedAt: nowIso() });
    return;
  }

  if (method === 'GET' && pathname === '/api/proxy/osm-notes') {
    const url = new URL(req.url, 'http://localhost');
    const bbox = url.searchParams.get('bbox') || '';
    if (!/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(bbox)) {
      sendJson(res, 400, { ok: false, error: 'bbox erforderlich (west,south,east,north)' });
      return;
    }
    try {
      const upstream = await fetch(
        `https://api.openstreetmap.org/api/0.6/notes/search?bbox=${encodeURIComponent(bbox)}&limit=35`,
        { headers: { Accept: 'application/xml', 'User-Agent': 'reineke.pro-nasebaer/1.0' } },
      );
      const body = await upstream.text();
      res.writeHead(upstream.status, {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=180',
      });
      res.end(body);
    } catch (err) {
      sendJson(res, 502, { ok: false, error: 'OSM nicht erreichbar: ' + err.message });
    }
    return;
  }

  // --- Agent-Schnittstelle (Etikettendruck-App, token-geschützt) -------------
  if (pathname === '/api/agent/poll' || pathname === '/api/agent/printed') {
    const url = new URL(req.url, 'http://localhost');
    const configured = agentToken();
    if (!configured) {
      sendJson(res, 503, {
        ok: false,
        error: 'Kein Zugangscode konfiguriert. Bitte in der Verwaltung unter Drucker einen Code erzeugen.',
      });
      return;
    }
    if (requestToken(req, url) !== configured) {
      sendJson(res, 401, { ok: false, error: 'Zugangscode ungültig.' });
      return;
    }

    if (method === 'GET' && pathname === '/api/agent/poll') {
      const now = new Date();
      sendJson(res, 200, {
        ok: true,
        serverTime: now.toISOString(),
        orders: orderPrintPayloads(),
        stockAlert: buildStockAlert(now),
        labelSettings: readDoc('ws-label-print-settings'),
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/agent/printed') {
      try {
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        markOrdersPrinted(Array.isArray(body.orderIds) ? body.orderIds : []);
        markStockSlotsPrinted(Array.isArray(body.stockSlots) ? body.stockSlots : []);
        await persistStore();
        sendJson(res, 200, { ok: true });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: 'Ungültiger Request: ' + err.message });
      }
      return;
    }

    sendJson(res, 405, { ok: false, error: 'Methode nicht erlaubt' });
    return;
  }

  // --- Nasebär Auth (Google Demo, Discord OAuth2) -----------------------------
  if (method === 'GET' && pathname === '/api/auth/discord/status') {
    sendJson(res, 200, { ok: true, configured: discordConfigured() });
    return;
  }

  if (method === 'GET' && pathname === '/api/auth/discord/start') {
    if (!discordConfigured()) {
      sendJson(res, 503, { ok: false, error: 'Discord OAuth ist nicht konfiguriert' });
      return;
    }
    const returnTo = url.searchParams.get('returnTo') || '/demo/nasebaer';
    const state = randomToken();
    storeOAuthState(state, { returnTo });
    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      redirect_uri: DISCORD_REDIRECT_URI,
      response_type: 'code',
      scope: 'identify email',
      state,
    });
    sendRedirect(res, `https://discord.com/api/oauth2/authorize?${params}`);
    return;
  }

  if (method === 'GET' && pathname === '/api/auth/discord/callback') {
    const fail = (message) => {
      sendRedirect(
        res,
        `${NASEBAER_FRONTEND_ORIGIN}/demo/nasebaer/auth/callback?error=${encodeURIComponent(message)}`,
      );
    };

    const oauthError = url.searchParams.get('error');
    if (oauthError) {
      fail('Discord-Anmeldung abgebrochen');
      return;
    }

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state) {
      fail('Ungültige Discord-Antwort');
      return;
    }

    const stored = consumeOAuthState(state);
    if (!stored) {
      fail('Anmelde-Sitzung abgelaufen — bitte erneut versuchen');
      return;
    }

    if (!discordConfigured()) {
      fail('Discord OAuth ist nicht konfiguriert');
      return;
    }

    try {
      const tokenBody = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }).toString();

      const tokenRes = await httpsRequest(
        'https://discord.com/api/oauth2/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(tokenBody),
          },
        },
        tokenBody,
      );

      if (tokenRes.status !== 200 || !tokenRes.body || !tokenRes.body.access_token) {
        fail('Discord-Token konnte nicht ausgetauscht werden');
        return;
      }

      const userRes = await httpsRequest('https://discord.com/api/users/@me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${tokenRes.body.access_token}` },
      });

      if (userRes.status !== 200 || !userRes.body || !userRes.body.id) {
        fail('Discord-Profil konnte nicht geladen werden');
        return;
      }

      const d = userRes.body;
      const user = {
        id: `discord-${d.id}`,
        name: d.global_name || d.username || 'Discord',
        email: d.email || '',
        avatarUrl: d.avatar
          ? `https://cdn.discordapp.com/avatars/${d.id}/${d.avatar}.png?size=64`
          : '',
        provider: 'discord',
      };

      const sessionToken = randomToken();
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
      writeDoc(`nb-session:${sessionToken}`, { user, expiresAt, createdAt: nowIso() });
      await persistStore();

      const redirectUrl = new URL(`${NASEBAER_FRONTEND_ORIGIN}/demo/nasebaer/auth/callback`);
      redirectUrl.searchParams.set('token', sessionToken);
      redirectUrl.searchParams.set('returnTo', stored.returnTo);
      sendRedirect(res, redirectUrl.toString());
    } catch (err) {
      console.error('[ws-backend] Discord OAuth:', err.message);
      fail('Discord-Anmeldung fehlgeschlagen');
    }
    return;
  }

  if (pathname === '/api/auth/register' && method === 'POST') {
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const email = normalizeEmail(body.email);
      const password = String(body.password || '');
      const name = String(body.name || '').trim().slice(0, 80);

      if (!isValidEmail(email)) {
        sendJson(res, 400, { ok: false, error: 'Ungültige E-Mail-Adresse' });
        return;
      }
      const passErr = passwordValidationError(password);
      if (passErr) {
        sendJson(res, 400, { ok: false, error: passErr });
        return;
      }
      if (readEmailUser(email)) {
        sendJson(res, 409, { ok: false, error: 'E-Mail ist bereits registriert' });
        return;
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword(password, salt);
      const id = emailUserId(email);
      const displayName = name || email.split('@')[0];
      writeDoc(`nb-user:${email}`, {
        id,
        email,
        name: displayName,
        passwordSalt: salt,
        passwordHash,
        createdAt: nowIso(),
      });
      const user = { id, name: displayName, email, avatarUrl: '', provider: 'email' };
      const session = await issueSession(user);
      sendJson(res, 201, { ok: true, ...session });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: 'Registrierung fehlgeschlagen' });
    }
    return;
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    const ip = clientIp(req);
    if (!checkLoginRate(ip)) {
      sendJson(res, 429, { ok: false, error: 'Zu viele Versuche — bitte kurz warten' });
      return;
    }
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const email = normalizeEmail(body.email);
      const password = String(body.password || '');

      if (!isValidEmail(email) || !password) {
        sendJson(res, 401, { ok: false, error: 'E-Mail oder Passwort falsch' });
        return;
      }

      const account = readEmailUser(email);
      if (!account || !account.passwordSalt || !account.passwordHash) {
        sendJson(res, 401, { ok: false, error: 'E-Mail oder Passwort falsch' });
        return;
      }
      if (!verifyPassword(password, account.passwordSalt, account.passwordHash)) {
        sendJson(res, 401, { ok: false, error: 'E-Mail oder Passwort falsch' });
        return;
      }

      const user = {
        id: account.id,
        name: account.name || email.split('@')[0],
        email: account.email,
        avatarUrl: '',
        provider: 'email',
      };
      const session = await issueSession(user);
      sendJson(res, 200, { ok: true, ...session });
    } catch {
      sendJson(res, 400, { ok: false, error: 'Anmeldung fehlgeschlagen' });
    }
    return;
  }

  if (pathname === '/api/auth/session') {
    if (method === 'POST') {
      try {
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        if (body.provider !== 'google') {
          sendJson(res, 400, {
            ok: false,
            error:
              body.provider === 'discord'
                ? 'Bitte Discord über OAuth anmelden'
                : 'Unbekannter Anbieter',
          });
          return;
        }
        const token = randomToken();
        const user = demoUser('google');
        const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
        writeDoc(`nb-session:${token}`, { user, expiresAt, createdAt: nowIso() });
        await persistStore();
        sendJson(res, 200, { ok: true, token, user });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: 'Ungültiger Request: ' + err.message });
      }
      return;
    }
    if (method === 'DELETE') {
      const token = bearerToken(req);
      if (token && store[`nb-session:${token}`]) {
        delete store[`nb-session:${token}`];
        await persistStore();
      }
      sendJson(res, 200, { ok: true });
      return;
    }
    sendJson(res, 405, { ok: false, error: 'Methode nicht erlaubt' });
    return;
  }

  if (method === 'GET' && pathname === '/api/auth/me') {
    const token = bearerToken(req);
    const session = readSession(token);
    if (!session) {
      sendJson(res, 401, { ok: false, error: 'Nicht angemeldet' });
      return;
    }
    sendJson(res, 200, { ok: true, user: session.user });
    return;
  }

  if (pathname === '/api/auth/pet') {
    const token = bearerToken(req);
    const session = readSession(token);
    if (!session) {
      sendJson(res, 401, { ok: false, error: 'Nicht angemeldet' });
      return;
    }
    const petKey = `nb-pet:${session.user.id}`;
    if (method === 'GET') {
      sendJson(res, 200, { ok: true, pet: readDoc(petKey) });
      return;
    }
    if (method === 'PUT') {
      try {
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        if (!body.pet || typeof body.pet !== 'object') {
          sendJson(res, 400, { ok: false, error: 'pet fehlt' });
          return;
        }
        writeDoc(petKey, body.pet);
        await persistStore();
        sendJson(res, 200, { ok: true });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: 'Ungültiger Request: ' + err.message });
      }
      return;
    }
    sendJson(res, 405, { ok: false, error: 'Methode nicht erlaubt' });
    return;
  }

  if (pathname === '/api/auth/profile/email' && method === 'POST') {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { ok: false, error: 'Nicht angemeldet' });
      return;
    }
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const newEmail = normalizeEmail(body.newEmail);
      const password = String(body.password || '');
      const account = findAccountById(session.user.id);
      if (!account || !account.passwordHash) {
        sendJson(res, 400, { ok: false, error: 'Profil kann nicht geändert werden' });
        return;
      }
      if (!verifyPassword(password, account.passwordSalt, account.passwordHash)) {
        sendJson(res, 401, { ok: false, error: 'Passwort ist falsch' });
        return;
      }
      if (!isValidEmail(newEmail)) {
        sendJson(res, 400, { ok: false, error: 'Ungültige E-Mail-Adresse' });
        return;
      }
      if (newEmail === account.emailKey) {
        sendJson(res, 400, { ok: false, error: 'Das ist bereits deine E-Mail' });
        return;
      }
      if (readEmailUser(newEmail)) {
        sendJson(res, 409, { ok: false, error: 'E-Mail ist bereits vergeben' });
        return;
      }
      const next = { ...account };
      delete next.emailKey;
      next.email = newEmail;
      delete store[`nb-user:${account.emailKey}`];
      writeDoc(`nb-user:${newEmail}`, next);
      const user = { ...session.user, email: newEmail, name: next.name || session.user.name };
      const token = bearerToken(req);
      writeDoc(`nb-session:${token}`, { ...session, user });
      await persistStore();
      sendJson(res, 200, { ok: true, user });
    } catch {
      sendJson(res, 400, { ok: false, error: 'E-Mail konnte nicht geändert werden' });
    }
    return;
  }

  if (pathname === '/api/auth/profile/password' && method === 'POST') {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { ok: false, error: 'Nicht angemeldet' });
      return;
    }
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const currentPassword = String(body.currentPassword || '');
      const newPassword = String(body.newPassword || '');
      const account = findAccountById(session.user.id);
      if (!account || !account.passwordHash) {
        sendJson(res, 400, { ok: false, error: 'Passwort kann nicht geändert werden' });
        return;
      }
      if (!verifyPassword(currentPassword, account.passwordSalt, account.passwordHash)) {
        sendJson(res, 401, { ok: false, error: 'Aktuelles Passwort ist falsch' });
        return;
      }
      const passErr = passwordValidationError(newPassword);
      if (passErr) {
        sendJson(res, 400, { ok: false, error: passErr });
        return;
      }
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword(newPassword, salt);
      const next = { ...account, passwordSalt: salt, passwordHash };
      delete next.emailKey;
      writeDoc(`nb-user:${account.emailKey}`, next);
      await persistStore();
      sendJson(res, 200, { ok: true });
    } catch {
      sendJson(res, 400, { ok: false, error: 'Passwort konnte nicht geändert werden' });
    }
    return;
  }

  if (pathname === '/api/social/overview' && method === 'GET') {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { ok: false, error: 'Nicht angemeldet' });
      return;
    }
    const userId = session.user.id;
    const social = readSocial(userId);
    const dogs = readDogs(userId);
    const notifications = readNotifs(userId);
    const share = readDoc(`nb-share:${userId}`);
    const meetups = readMeetups(userId);
    const shareActive =
      share && new Date(share.expiresAt).getTime() > Date.now() ? share : null;
    if (!shareActive && share) delete store[`nb-share:${userId}`];
    const unread = notifications.filter((n) => !n.read).length;
    sendJson(res, 200, {
      ok: true,
      social,
      dogs,
      notifications,
      unread,
      share: shareActive,
      meetups,
    });
    return;
  }

  if (pathname === '/api/social/nearby' && method === 'GET') {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { ok: false, error: 'Nicht angemeldet' });
      return;
    }
    const lat = Number(url.searchParams.get('lat'));
    const lng = Number(url.searchParams.get('lng'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      sendJson(res, 400, { ok: false, error: 'Standort fehlt' });
      return;
    }
    const myShare = readDoc(`nb-share:${session.user.id}`);
    const viewerRadius =
      myShare && new Date(myShare.expiresAt).getTime() > Date.now()
        ? Number(myShare.radiusKm) || DEFAULT_SHARE_RADIUS_KM
        : DEFAULT_SHARE_RADIUS_KM;
    const nearby = [];
    for (const entry of activeShares()) {
      if (entry.userId === session.user.id) continue;
      const dist = haversineKm(lat, lng, entry.lat, entry.lng);
      const theirRadius = Number(entry.radiusKm) || DEFAULT_SHARE_RADIUS_KM;
      const maxRange = Math.max(viewerRadius, theirRadius);
      if (dist > maxRange) continue;
      const account = findAccountById(entry.userId);
      if (!account) continue;
      const dogs = readDogs(entry.userId);
      const social = readSocial(entry.userId);
      const isFriend = social.friends.some((f) => f.userId === session.user.id);
      const requestPending =
        social.requestsOut.some((r) => r.userId === session.user.id) ||
        readSocial(session.user.id).requestsOut.some((r) => r.userId === entry.userId);
      nearby.push({
        ...userPublicFromAccount(account),
        distanceKm: Math.round(dist * 10) / 10,
        dogs,
        isFriend,
        requestPending,
        sharingUntil: entry.expiresAt,
      });
    }
    nearby.sort((a, b) => a.distanceKm - b.distanceKm);
    sendJson(res, 200, { ok: true, nearby });
    return;
  }

  if (pathname === '/api/social/share' && method === 'PUT') {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { ok: false, error: 'Nicht angemeldet' });
      return;
    }
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const lat = Number(body.lat);
      const lng = Number(body.lng);
      let radiusKm = Number(body.radiusKm);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        sendJson(res, 400, { ok: false, error: 'Standort fehlt' });
        return;
      }
      if (!Number.isFinite(radiusKm) || radiusKm < 1) radiusKm = DEFAULT_SHARE_RADIUS_KM;
      if (radiusKm > 50) radiusKm = 50;
      const expiresAt = new Date(Date.now() + SHARE_DURATION_MS).toISOString();
      const share = { lat, lng, radiusKm, expiresAt, updatedAt: nowIso() };
      writeDoc(`nb-share:${session.user.id}`, share);
      await persistStore();
      sendJson(res, 200, { ok: true, share });
    } catch {
      sendJson(res, 400, { ok: false, error: 'Standortfreigabe fehlgeschlagen' });
    }
    return;
  }

  if (pathname === '/api/social/share' && method === 'DELETE') {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { ok: false, error: 'Nicht angemeldet' });
      return;
    }
    delete store[`nb-share:${session.user.id}`];
    await persistStore();
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === '/api/social/dogs') {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { ok: false, error: 'Nicht angemeldet' });
      return;
    }
    const userId = session.user.id;
    if (method === 'GET') {
      sendJson(res, 200, { ok: true, dogs: readDogs(userId) });
      return;
    }
    if (method === 'POST') {
      try {
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        const dogs = readDogs(userId);
        if (dogs.length >= 8) {
          sendJson(res, 400, { ok: false, error: 'Maximal 8 Hunde' });
          return;
        }
        const dog = {
          id: randomToken().slice(0, 10),
          name: String(body.name || '').trim().slice(0, 40) || 'Unbenannt',
          breed: String(body.breed || '').trim().slice(0, 60),
          size: String(body.size || 'mittel').slice(0, 20),
          weightKg: Math.max(0, Math.min(120, Number(body.weightKg) || 0)),
          traits: String(body.traits || '').trim().slice(0, 280),
          createdAt: nowIso(),
        };
        dogs.push(dog);
        writeDoc(`nb-dogs:${userId}`, dogs);
        await persistStore();
        sendJson(res, 201, { ok: true, dog, dogs });
      } catch {
        sendJson(res, 400, { ok: false, error: 'Hund konnte nicht angelegt werden' });
      }
      return;
    }
    if (method === 'PUT') {
      try {
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        const dogs = readDogs(userId);
        const idx = dogs.findIndex((d) => d.id === body.id);
        if (idx < 0) {
          sendJson(res, 404, { ok: false, error: 'Hund nicht gefunden' });
          return;
        }
        dogs[idx] = {
          ...dogs[idx],
          name: String(body.name || dogs[idx].name).trim().slice(0, 40),
          breed: String(body.breed || '').trim().slice(0, 60),
          size: String(body.size || dogs[idx].size).slice(0, 20),
          weightKg: Math.max(0, Math.min(120, Number(body.weightKg) || dogs[idx].weightKg)),
          traits: String(body.traits || '').trim().slice(0, 280),
        };
        writeDoc(`nb-dogs:${userId}`, dogs);
        await persistStore();
        sendJson(res, 200, { ok: true, dogs });
      } catch {
        sendJson(res, 400, { ok: false, error: 'Hund konnte nicht gespeichert werden' });
      }
      return;
    }
    if (method === 'DELETE') {
      try {
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        const dogs = readDogs(userId).filter((d) => d.id !== body.id);
        writeDoc(`nb-dogs:${userId}`, dogs);
        await persistStore();
        sendJson(res, 200, { ok: true, dogs });
      } catch {
        sendJson(res, 400, { ok: false, error: 'Hund konnte nicht gelöscht werden' });
      }
      return;
    }
    sendJson(res, 405, { ok: false, error: 'Methode nicht erlaubt' });
    return;
  }

  if (pathname === '/api/social/friends/request' && method === 'POST') {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { ok: false, error: 'Nicht angemeldet' });
      return;
    }
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const targetId = String(body.targetUserId || '');
      if (!targetId || targetId === session.user.id) {
        sendJson(res, 400, { ok: false, error: 'Ungültiger Nutzer' });
        return;
      }
      const target = findAccountById(targetId);
      if (!target) {
        sendJson(res, 404, { ok: false, error: 'Nutzer nicht gefunden' });
        return;
      }
      const mine = readSocial(session.user.id);
      const theirs = readSocial(targetId);
      if (mine.friends.some((f) => f.userId === targetId)) {
        sendJson(res, 409, { ok: false, error: 'Bereits befreundet' });
        return;
      }
      if (
        mine.requestsOut.some((r) => r.userId === targetId) ||
        theirs.requestsIn.some((r) => r.userId === session.user.id)
      ) {
        sendJson(res, 409, { ok: false, error: 'Anfrage bereits gesendet' });
        return;
      }
      const reqId = randomToken().slice(0, 10);
      mine.requestsOut.push({ userId: targetId, name: target.name, at: nowIso() });
      theirs.requestsIn.push({
        id: reqId,
        userId: session.user.id,
        name: session.user.name,
        at: nowIso(),
      });
      writeSocial(session.user.id, mine);
      writeSocial(targetId, theirs);
      addNotif(targetId, {
        type: 'friend_request',
        title: 'Neue Freundschaftsanfrage',
        body: `${session.user.name} möchte sich vernetzen.`,
        fromUserId: session.user.id,
        requestId: reqId,
      });
      await persistStore();
      sendJson(res, 200, { ok: true, social: mine });
    } catch {
      sendJson(res, 400, { ok: false, error: 'Anfrage fehlgeschlagen' });
    }
    return;
  }

  if (pathname === '/api/social/friends/respond' && method === 'POST') {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { ok: false, error: 'Nicht angemeldet' });
      return;
    }
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const requestId = String(body.requestId || '');
      const accept = Boolean(body.accept);
      const mine = readSocial(session.user.id);
      const idx = mine.requestsIn.findIndex((r) => r.id === requestId);
      if (idx < 0) {
        sendJson(res, 404, { ok: false, error: 'Anfrage nicht gefunden' });
        return;
      }
      const incoming = mine.requestsIn[idx];
      mine.requestsIn.splice(idx, 1);
      const theirs = readSocial(incoming.userId);
      theirs.requestsOut = theirs.requestsOut.filter((r) => r.userId !== session.user.id);
      if (accept) {
        const since = nowIso();
        mine.friends.push({ userId: incoming.userId, name: incoming.name, since });
        theirs.friends.push({ userId: session.user.id, name: session.user.name, since });
        addNotif(incoming.userId, {
          type: 'friend_accept',
          title: 'Freundschaft bestätigt',
          body: `${session.user.name} hat deine Anfrage angenommen.`,
          fromUserId: session.user.id,
        });
      }
      writeSocial(session.user.id, mine);
      writeSocial(incoming.userId, theirs);
      await persistStore();
      sendJson(res, 200, { ok: true, social: mine });
    } catch {
      sendJson(res, 400, { ok: false, error: 'Antwort fehlgeschlagen' });
    }
    return;
  }

  if (pathname === '/api/social/meetups' && method === 'POST') {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { ok: false, error: 'Nicht angemeldet' });
      return;
    }
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const lat = Number(body.lat);
      const lng = Number(body.lng);
      const scheduledAt = String(body.scheduledAt || '');
      const inviteIds = Array.isArray(body.inviteUserIds)
        ? body.inviteUserIds.map(String).filter(Boolean)
        : [];
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !scheduledAt) {
        sendJson(res, 400, { ok: false, error: 'Ort und Zeit sind Pflicht' });
        return;
      }
      const meetupId = randomToken().slice(0, 12);
      const invites = [{ userId: session.user.id, name: session.user.name, status: 'accepted' }];
      const participantIds = new Set([session.user.id]);
      for (const uid of inviteIds) {
        if (uid === session.user.id || participantIds.has(uid)) continue;
        const acc = findAccountById(uid);
        if (!acc) continue;
        participantIds.add(uid);
        invites.push({ userId: uid, name: acc.name, status: 'pending' });
        addNotif(uid, {
          type: 'meetup_invite',
          title: 'Treffen-Einladung',
          body: `${session.user.name} lädt zu „${String(body.spotName || 'Spaziergang').slice(0, 60)}“ ein.`,
          meetupId,
          fromUserId: session.user.id,
        });
      }
      const meetup = {
        id: meetupId,
        hostUserId: session.user.id,
        hostName: session.user.name,
        spotId: String(body.spotId || ''),
        spotName: String(body.spotName || 'Treffpunkt').slice(0, 80),
        lat,
        lng,
        scheduledAt,
        message: String(body.message || '').trim().slice(0, 240),
        invites,
        createdAt: nowIso(),
      };
      appendMeetupForUsers([...participantIds], meetup);
      await persistStore();
      sendJson(res, 201, { ok: true, meetup });
    } catch {
      sendJson(res, 400, { ok: false, error: 'Treffen konnte nicht erstellt werden' });
    }
    return;
  }

  if (pathname === '/api/social/meetups/respond' && method === 'POST') {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { ok: false, error: 'Nicht angemeldet' });
      return;
    }
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const meetupId = String(body.meetupId || '');
      const accept = Boolean(body.accept);
      const list = readMeetups(session.user.id);
      const meetup = list.find((m) => m.id === meetupId);
      if (!meetup) {
        sendJson(res, 404, { ok: false, error: 'Treffen nicht gefunden' });
        return;
      }
      const inv = meetup.invites.find((i) => i.userId === session.user.id);
      if (!inv) {
        sendJson(res, 403, { ok: false, error: 'Keine Einladung' });
        return;
      }
      inv.status = accept ? 'accepted' : 'declined';
      writeMeetups(session.user.id, list);
      for (const p of meetup.invites) {
        if (p.userId === session.user.id) continue;
        const pl = readMeetups(p.userId);
        const pm = pl.find((m) => m.id === meetupId);
        if (pm) {
          const pi = pm.invites.find((i) => i.userId === session.user.id);
          if (pi) pi.status = inv.status;
          writeMeetups(p.userId, pl);
        }
        if (accept && p.userId === meetup.hostUserId) {
          addNotif(p.userId, {
            type: 'meetup_accept',
            title: 'Treffen bestätigt',
            body: `${session.user.name} kommt zum Treffen.`,
            meetupId,
            fromUserId: session.user.id,
          });
        }
      }
      await persistStore();
      sendJson(res, 200, { ok: true, meetup });
    } catch {
      sendJson(res, 400, { ok: false, error: 'Antwort fehlgeschlagen' });
    }
    return;
  }

  if (pathname === '/api/social/notifications/read' && method === 'POST') {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { ok: false, error: 'Nicht angemeldet' });
      return;
    }
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
      const list = readNotifs(session.user.id).map((n) =>
        ids.length === 0 || ids.includes(n.id) ? { ...n, read: true } : n,
      );
      writeDoc(`nb-notifications:${session.user.id}`, list);
      await persistStore();
      sendJson(res, 200, { ok: true, notifications: list, unread: list.filter((n) => !n.read).length });
    } catch {
      sendJson(res, 400, { ok: false, error: 'Fehler beim Markieren' });
    }
    return;
  }

  if (pathname === '/api/spots/social/batch' && method === 'GET') {
    const ids = String(url.searchParams.get('ids') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const withComments = ids.filter((id) => {
      const doc = readSpotSocial(id);
      return doc.comments.length > 0;
    });
    const blocked = ids.filter((id) => isSpotBlocked(id));
    sendJson(res, 200, { ok: true, ids: withComments, blockedIds: blocked });
    return;
  }

  const spotReportMatch = pathname.match(/^\/api\/spots\/([^/]+)\/report$/);
  if (spotReportMatch && method === 'POST') {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { ok: false, error: 'Nicht angemeldet' });
      return;
    }
    const spotId = decodeURIComponent(spotReportMatch[1]);
    try {
      if (isSpotBlocked(spotId)) {
        sendJson(res, 200, { ok: true, blocked: true, reportCount: SPOT_REPORT_BLOCK_COUNT, alreadyReported: false });
        return;
      }
      const doc = readSpotReports(spotId);
      const uid = session.user.id;
      const already = doc.reporters.some((r) => r.userId === uid);
      if (!already) {
        doc.reporters.push({ userId: uid, at: nowIso() });
      }
      const uniqueCount = new Set(doc.reporters.map((r) => r.userId)).size;
      let blocked = doc.blocked;
      if (uniqueCount >= SPOT_REPORT_BLOCK_COUNT) {
        blocked = true;
        doc.blocked = true;
        doc.blockedAt = nowIso();
        writeSpotReports(spotId, doc);
        markSpotBlocked(spotId);
      } else {
        writeSpotReports(spotId, doc);
      }
      await persistStore();
      sendJson(res, 200, {
        ok: true,
        blocked,
        reportCount: uniqueCount,
        alreadyReported: already,
      });
    } catch {
      sendJson(res, 400, { ok: false, error: 'Meldung fehlgeschlagen' });
    }
    return;
  }

  const spotSocialMatch = pathname.match(/^\/api\/spots\/([^/]+)\/social(?:\/(comment|vote))?$/);
  if (spotSocialMatch) {
    const spotId = decodeURIComponent(spotSocialMatch[1]);
    const action = spotSocialMatch[2];
    const session = requireAuth(req);

    if (method === 'GET' && !action) {
      const doc = readSpotSocial(spotId);
      sendJson(res, 200, spotSocialPayload(doc, session?.user?.id));
      return;
    }

    if (!session) {
      sendJson(res, 401, { ok: false, error: 'Nicht angemeldet' });
      return;
    }

    if (method === 'POST' && action === 'comment') {
      try {
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        const text = String(body.text || '').trim().slice(0, 500);
        if (!text) {
          sendJson(res, 400, { ok: false, error: 'Kommentar fehlt' });
          return;
        }
        const doc = readSpotSocial(spotId);
        doc.comments.unshift({
          id: randomToken().slice(0, 10),
          userId: session.user.id,
          userName: session.user.name,
          text,
          createdAt: nowIso(),
        });
        doc.comments = doc.comments.slice(0, 40);
        writeSpotSocial(spotId, doc);
        await persistStore();
        sendJson(res, 200, spotSocialPayload(doc, session.user.id));
      } catch {
        sendJson(res, 400, { ok: false, error: 'Kommentar fehlgeschlagen' });
      }
      return;
    }

    if (method === 'POST' && action === 'vote') {
      try {
        const raw = await readBody(req);
        const body = raw ? JSON.parse(raw) : {};
        const direction = body.direction === 'down' ? 'down' : 'up';
        const doc = readSpotSocial(spotId);
        const uid = session.user.id;
        const hadUp = doc.upvotes.includes(uid);
        const hadDown = doc.downvotes.includes(uid);
        doc.upvotes = doc.upvotes.filter((id) => id !== uid);
        doc.downvotes = doc.downvotes.filter((id) => id !== uid);
        if (direction === 'up' && !hadUp) doc.upvotes.push(uid);
        else if (direction === 'down' && !hadDown) doc.downvotes.push(uid);
        writeSpotSocial(spotId, doc);
        await persistStore();
        sendJson(res, 200, spotSocialPayload(doc, session.user.id));
      } catch {
        sendJson(res, 400, { ok: false, error: 'Bewertung fehlgeschlagen' });
      }
      return;
    }

    sendJson(res, 405, { ok: false, error: 'Methode nicht erlaubt' });
    return;
  }

  if (pathname === '/api/pins' && method === 'GET') {
    const session = requireAuth(req);
    const lat = Number(url.searchParams.get('lat'));
    const lng = Number(url.searchParams.get('lng'));
    let radiusKm = Number(url.searchParams.get('radiusKm')) || 15;
    if (radiusKm > 50) radiusKm = 50;
    const pins = readAllPins().filter((p) => {
      if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return false;
      if (isSpotBlocked(p.id)) return false;
      const isPublic = p.visibility === 'public';
      const isOwn = session && p.userId === session.user.id;
      if (!isPublic && !isOwn) return false;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return true;
      return haversineKm(lat, lng, p.lat, p.lng) <= radiusKm;
    });
    sendJson(res, 200, { ok: true, pins });
    return;
  }

  if (pathname === '/api/pins' && method === 'POST') {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { ok: false, error: 'Nicht angemeldet' });
      return;
    }
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const lat = Number(body.lat);
      const lng = Number(body.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        sendJson(res, 400, { ok: false, error: 'Koordinaten fehlen' });
        return;
      }
      const pin = {
        id: randomToken().slice(0, 12),
        userId: session.user.id,
        userName: session.user.name,
        visibility: body.visibility === 'private' ? 'private' : 'public',
        emoji: String(body.emoji || '📍').slice(0, 4),
        title: String(body.title || 'Mein Ort').trim().slice(0, 80),
        description: String(body.description || '').trim().slice(0, 400),
        lat,
        lng,
        address: String(body.address || '').trim().slice(0, 200),
        createdAt: nowIso(),
      };
      const list = readAllPins();
      list.unshift(pin);
      writeAllPins(list.slice(0, 500));
      await persistStore();
      sendJson(res, 201, { ok: true, pin });
    } catch {
      sendJson(res, 400, { ok: false, error: 'Marker konnte nicht gespeichert werden' });
    }
    return;
  }

  const pinIdMatch = pathname.match(/^\/api\/pins\/([^/]+)$/);
  if (pinIdMatch && method === 'DELETE') {
    const session = requireAuth(req);
    if (!session) {
      sendJson(res, 401, { ok: false, error: 'Nicht angemeldet' });
      return;
    }
    const pinId = decodeURIComponent(pinIdMatch[1]);
    const list = readAllPins();
    const pin = list.find((p) => p.id === pinId);
    if (!pin) {
      sendJson(res, 404, { ok: false, error: 'Marker nicht gefunden' });
      return;
    }
    if (pin.userId !== session.user.id) {
      sendJson(res, 403, { ok: false, error: 'Keine Berechtigung' });
      return;
    }
    writeAllPins(list.filter((p) => p.id !== pinId));
    await persistStore();
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname.startsWith('/api/state/')) {
    const key = pathname.slice('/api/state/'.length);
    if (!key) {
      sendJson(res, 400, { ok: false, error: 'Kein Key angegeben' });
      return;
    }

    if (method === 'GET') {
      const entry = store[key];
      sendJson(res, 200, { value: entry ? entry.value : null });
      return;
    }

    if (method === 'PUT') {
      try {
        const raw = await readBody(req);
        const parsed = raw ? JSON.parse(raw) : {};
        const value = parsed && typeof parsed.value === 'string' ? parsed.value : null;
        if (value === null) {
          sendJson(res, 400, { ok: false, error: 'Feld "value" (String) fehlt' });
          return;
        }
        if (Buffer.byteLength(value, 'utf8') > MAX_VALUE_BYTES) {
          sendJson(res, 413, { ok: false, error: 'Wert zu groß' });
          return;
        }
        store[key] = { value, updatedAt: nowIso() };
        await persistStore();
        sendJson(res, 200, { ok: true, updatedAt: store[key].updatedAt });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: 'Ungültiger Request: ' + err.message });
      }
      return;
    }

    sendJson(res, 405, { ok: false, error: 'Methode nicht erlaubt' });
    return;
  }

  const fusswerkHandled = await handleFusswerkBooking({
    req,
    res,
    method,
    pathname,
    url,
    store,
    persistStore,
    readBody,
    sendJson,
    sendRedirect,
    randomToken,
    nowIso,
    clientIp,
  });
  if (fusswerkHandled) return;

  sendJson(res, 404, { ok: false, error: 'Nicht gefunden' });
});

async function start() {
  await ensureDataDir();
  await loadStore();
  server.listen(PORT, () => {
    console.log(`[ws-backend] läuft auf Port ${PORT}, Datei: ${DATA_FILE}, Keys: ${Object.keys(store).length}`);
  });
}

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

start();
