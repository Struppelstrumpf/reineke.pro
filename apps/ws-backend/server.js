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
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
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
