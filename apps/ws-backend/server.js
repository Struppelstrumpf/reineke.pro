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
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const PORT = Number(process.env.PORT) || 19290;
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
    'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-ws-token',
    'Cache-Control': 'no-store',
  });
  res.end(data);
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

function writeDoc(key, obj) {
  store[key] = { value: JSON.stringify(obj), updatedAt: nowIso() };
  return persistStore();
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
  let pathname = '/';
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    pathname = req.url || '/';
  }

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-ws-token',
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
