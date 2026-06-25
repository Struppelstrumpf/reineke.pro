const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  shell,
} = require('electron');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const { buildLabelPages } = require('./label-layout');
const { buildStockAlertLabelPages } = require('./stock-alert-layout');
const { renderSinglePageHtml } = require('./label-template');
const {
  DEFAULT_LABEL_SETTINGS,
  normalizeLabelSettings,
  labelPageDimensions,
} = require('./label-settings');

const PORT = 19284;
const PROTOCOL = 'wslabel';
const VERSION = '1.4.5';
const DEMO_URL_HINT = 'reineke.pro/demo/weisser-schaefer';
const ALLOW_DOTNET_FALLBACK = process.env.WS_ALLOW_DOTNET_FALLBACK === '1';

// Idempotenz: gleiche Bestellung innerhalb dieses Fensters nicht erneut drucken (ohne force).
const PRINT_DEDUP_MS = 10 * 60 * 1000;
const RECENT_PRINTS_MAX = 200;
const RECENT_PRINTS_TTL_MS = 24 * 60 * 60 * 1000;

let tray = null;
let printWindow = null;
let selectedPrinter = null;
let lastWebPing = 0;
let lastPrintError = null;
let lastPrintOk = null;
let cachedPrinters = [];
let printersCachedAt = 0;
/** Solange ein Druck läuft: /health & Druckerliste NICHT blockieren (gecachte Werte). */
let isPrinting = false;
/** Nachweis (und Reservierung) gedruckter Aufträge: { orderId, jobId, at, pending? } */
let recentPrints = [];

function pruneRecentPrints() {
  const cutoff = Date.now() - RECENT_PRINTS_TTL_MS;
  recentPrints = recentPrints
    .filter((p) => new Date(p.at).getTime() >= cutoff)
    .slice(-RECENT_PRINTS_MAX);
}

function recordPrint(orderId, jobId) {
  recentPrints.push({
    orderId: orderId || null,
    jobId: jobId || null,
    at: new Date().toISOString(),
  });
  pruneRecentPrints();
  saveRecentPrints();
}

/**
 * Reserviert einen Auftrag VOR dem Druck → blockt sofort jede gleichzeitige
 * Doppelanfrage (auch während der erste Druck noch läuft). Verhindert Doppeldruck.
 */
function reservePrint(orderId, jobId) {
  recordPrint(orderId, jobId);
}

/** Reservierung wieder entfernen, wenn der Druck wirklich fehlgeschlagen ist (Retry erlauben). */
function unreservePrint(orderId, jobId) {
  if (jobId) {
    recentPrints = recentPrints.filter((p) => p.jobId !== jobId);
  } else if (orderId) {
    // Letzten Eintrag dieser Bestellung entfernen.
    for (let i = recentPrints.length - 1; i >= 0; i -= 1) {
      if (recentPrints[i].orderId === orderId) {
        recentPrints.splice(i, 1);
        break;
      }
    }
  }
  saveRecentPrints();
}

/**
 * Druck-Mutex: stellt sicher, dass NIE zwei Druckaufträge gleichzeitig laufen
 * (das geteilte Druckfenster verträgt keine Parallelität → sonst fehlende/falsche Etiketten).
 */
let printQueue = Promise.resolve();
function runExclusive(task) {
  const run = printQueue.then(task, task);
  printQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Bereits gedruckt/reserviert? jobId immer; orderId nur im Cooldown (ohne force). */
function findDuplicatePrint(orderId, jobId, force) {
  const now = Date.now();
  if (jobId) {
    const byJob = recentPrints.find((p) => p.jobId && p.jobId === jobId);
    if (byJob) {
      return byJob;
    }
  }
  if (!force && orderId) {
    const byOrder = recentPrints.find(
      (p) => p.orderId === orderId && now - new Date(p.at).getTime() < PRINT_DEDUP_MS,
    );
    if (byOrder) {
      return byOrder;
    }
  }
  return null;
}

function isUncertainPrintError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('aborted') ||
    msg.includes('unterbrochen')
  );
}

const statePath = () => path.join(app.getPath('userData'), 'printer.json');
const labelSettingsPath = () => path.join(app.getPath('userData'), 'label-settings.json');
const printLogPath = () => path.join(app.getPath('userData'), 'print-log.json');

function loadRecentPrints() {
  try {
    const raw = fs.readFileSync(printLogPath(), 'utf8');
    const data = JSON.parse(raw);
    recentPrints = Array.isArray(data) ? data : [];
  } catch {
    recentPrints = [];
  }
  pruneRecentPrints();
}

function saveRecentPrints() {
  try {
    fs.writeFileSync(printLogPath(), JSON.stringify(recentPrints), 'utf8');
  } catch {
    /* ignore */
  }
}

let labelSettings = { ...DEFAULT_LABEL_SETTINGS };

function loadLabelSettings() {
  try {
    const raw = fs.readFileSync(labelSettingsPath(), 'utf8');
    labelSettings = normalizeLabelSettings(JSON.parse(raw));
  } catch {
    labelSettings = { ...DEFAULT_LABEL_SETTINGS };
  }
}

function saveLabelSettings(next) {
  labelSettings = normalizeLabelSettings(next);
  fs.writeFileSync(labelSettingsPath(), JSON.stringify(labelSettings, null, 2), 'utf8');
}

function getLabelSettings() {
  return { ...labelSettings };
}

function loadPrinter() {
  try {
    const raw = fs.readFileSync(statePath(), 'utf8');
    const data = JSON.parse(raw);
    selectedPrinter = data.printer || null;
  } catch {
    selectedPrinter = null;
  }
}

function savePrinter(name) {
  selectedPrinter = name;
  fs.writeFileSync(statePath(), JSON.stringify({ printer: name }), 'utf8');
}

function psEscape(str) {
  return String(str).replace(/'/g, "''");
}

function buildTrayIcon() {
  const w = 32;
  const h = 32;
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const dx = x - 15.5;
      const dy = y - 15.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= 13) {
        buf[i] = 200;
        buf[i + 1] = 217;
        buf[i + 2] = 106;
        buf[i + 3] = 255;
      } else if (dist <= 15) {
        buf[i] = 255;
        buf[i + 1] = 255;
        buf[i + 2] = 255;
        buf[i + 3] = 220;
      } else {
        buf[i + 3] = 0;
      }
    }
  }
  return nativeImage.createFromBuffer(buf, { width: w, height: h }).resize({ width: 16, height: 16 });
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, code, body) {
  cors(res);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        reject(new Error('too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('invalid json'));
      }
    });
    req.on('error', reject);
  });
}

function ensurePrintWindow() {
  if (printWindow && !printWindow.isDestroyed()) {
    return printWindow;
  }
  printWindow = new BrowserWindow({
    show: false,
    width: 320,
    height: 240,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });
  return printWindow;
}

async function preloadPrintWindow() {
  const win = ensurePrintWindow();
  if (!win.webContents.getURL() || win.webContents.getURL() === 'about:blank') {
    await win.loadURL('about:blank');
  }
}

async function refreshPrinters(force = false) {
  // Während eines Drucks NICHT das (geteilte) Druckfenster abfragen → /health bleibt schnell.
  if (isPrinting && cachedPrinters.length > 0) {
    return cachedPrinters;
  }
  const age = Date.now() - printersCachedAt;
  if (!force && cachedPrinters.length > 0 && age < 45000) {
    return cachedPrinters;
  }
  const win = ensurePrintWindow();
  const list = await win.webContents.getPrintersAsync();
  cachedPrinters = list;
  printersCachedAt = Date.now();
  return list;
}

function resolvePrinterName(printers) {
  if (!printers.length) {
    return null;
  }
  if (selectedPrinter && printers.some((p) => p.name === selectedPrinter)) {
    return selectedPrinter;
  }
  const match = printers.find((p) =>
    /label|etikett|zebra|tsc|xprinter|gprinter|barcode|pos|thermal/i.test(p.name),
  );
  return (
    match?.name ||
    printers.find((p) => p.isDefault)?.name ||
    printers[0]?.name ||
    null
  );
}

function resolveAsset(...parts) {
  const candidates = [
    path.join(__dirname, '..', ...parts),
    path.join(app.getAppPath(), ...parts),
    path.join(process.resourcesPath, 'app.asar', ...parts),
    path.join(process.resourcesPath, ...parts),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
}

function logoAssetPath() {
  return resolveAsset('assets', 'ws-logo-print.png');
}

function logoDataUri() {
  try {
    const buf = fs.readFileSync(logoAssetPath());
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return '';
  }
}

async function printViaDotNet(pages, printerName) {
  const logoPath = logoAssetPath();
  const jsonPath = path.join(app.getPath('temp'), `ws-label-${Date.now()}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify({ pages, logoPath }), 'utf8');

  const script = [
    "$ErrorActionPreference = 'Stop'",
    'Add-Type -AssemblyName System.Drawing',
    `$printer = '${psEscape(printerName)}'`,
    `$jsonPath = '${psEscape(jsonPath)}'`,
    '$data = Get-Content -LiteralPath $jsonPath -Raw -Encoding UTF8 | ConvertFrom-Json',
    '$pageList = @($data.pages)',
    '$logoPath = [string]$data.logoPath',
    '$script:pageIndex = 0',
    '$doc = New-Object System.Drawing.Printing.PrintDocument',
    '$doc.PrinterSettings.PrinterName = $printer',
    '$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)',
    '$doc.add_PrintPage({',
    '  param($sender, $ev)',
    '  $rows = @($pageList[$script:pageIndex].lines)',
    '  $g = $ev.Graphics',
    '  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit',
    '  $page = $ev.PageBounds',
    '  $area = $ev.MarginBounds',
    '  if ($area.Width -lt 40 -or $area.Height -lt 40) { $area = $page }',
    '  $pw = $area.Width',
    '  $ph = $area.Height',
    '  $mx = [math]::Max([int]($pw * 0.08), 4)',
    '  $my = [math]::Max([int]($ph * 0.08), 4)',
    '  $innerW = $pw - 2 * $mx',
    '  $innerH = $ph - 2 * $my',
    '  $x = $area.Left + $mx',
    '  $y = $area.Top + $my',
    '  $bottom = $area.Top + $my + $innerH',
    '  $gap = 2',
    '  $baseTitle = 8.5',
    '  $baseSub = 7.5',
    '  $baseBody = 6.5',
    '  $baseMeta = 5.5',
    '  $baseContact = 5.0',
    '  function New-LabelFonts([double]$scale) {',
    '    $s = [math]::Max(0.55, $scale)',
    '    return @{',
    '      title = New-Object System.Drawing.Font("Arial", ($baseTitle * $s), [System.Drawing.FontStyle]::Bold)',
    '      subtitle = New-Object System.Drawing.Font("Arial", ($baseSub * $s), [System.Drawing.FontStyle]::Bold)',
    '      body = New-Object System.Drawing.Font("Arial", ($baseBody * $s))',
    '      meta = New-Object System.Drawing.Font("Arial", ($baseMeta * $s))',
    '      contact = New-Object System.Drawing.Font("Arial", ($baseContact * $s))',
    '      page = New-Object System.Drawing.Font("Arial", ($baseMeta * $s), [System.Drawing.FontStyle]::Bold)',
    '      barcode = New-Object System.Drawing.Font("Consolas", ($baseMeta * $s))',
    '    }',
    '  }',
    '  function Get-RowFont($fonts, $style) {',
    '    switch ($style) {',
    '      "title" { return $fonts.title }',
    '      "subtitle" { return $fonts.subtitle }',
    '      "meta" { return $fonts.meta }',
    '      "contact" { return $fonts.contact }',
    '      "page" { return $fonts.page }',
    '      "barcode" { return $fonts.barcode }',
    '      default { return $fonts.body }',
    '    }',
    '  }',
    '  function Measure-Rows($fonts) {',
    '    $total = 0.0',
    '    foreach ($row in $rows) {',
    '      if ($row.style -eq "logo") {',
    '        $total += [math]::Min([int]($innerH * 0.14), 42) + $gap',
    '        continue',
    '      }',
    '      if ($row.style -eq "divider") {',
    '        $total += 4 + $gap',
    '        continue',
    '      }',
    '      $font = Get-RowFont $fonts $row.style',
    '      $h = $g.MeasureString($row.text, $font, $innerW).Height',
    '      $total += $h + $gap',
    '    }',
    '    return $total',
    '  }',
    '  $scale = 1.0',
    '  $needed = Measure-Rows (New-LabelFonts 1.0)',
    '  if ($needed -gt $innerH) {',
    '    $scale = ($innerH / $needed) * 0.96',
    '  }',
    '  $fonts = New-LabelFonts $scale',
    '  $brush = [System.Drawing.Brushes]::Black',
    '  $format = New-Object System.Drawing.StringFormat',
    '  foreach ($row in $rows) {',
    '    $remaining = $bottom - $y',
    '    if ($remaining -le 4) { break }',
    '    if ($row.style -eq "logo") {',
    '      if (Test-Path -LiteralPath $logoPath) {',
    '        $img = [System.Drawing.Image]::FromFile($logoPath)',
    '        $logoH = [math]::Min([int]($innerH * 0.14), 42)',
    '        $logoW = [int]($img.Width / $img.Height * $logoH)',
    '        if ($logoW -gt $innerW) {',
    '          $logoW = $innerW',
    '          $logoH = [int]($img.Height / $img.Width * $logoW)',
    '        }',
    '        $g.DrawImage($img, $x, $y, $logoW, $logoH)',
    '        $img.Dispose()',
    '        $y += $logoH + $gap',
    '      }',
    '      continue',
    '    }',
    '    if ($row.style -eq "divider") {',
    '      $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(160, 160, 160))',
    '      $lineY = $y + 1',
    '      $g.DrawLine($pen, $x, $lineY, $x + $innerW, $lineY)',
    '      $pen.Dispose()',
    '      $y += 4 + $gap',
    '      continue',
    '    }',
    '    $font = Get-RowFont $fonts $row.style',
    '    $rect = New-Object System.Drawing.RectangleF($x, $y, $innerW, $remaining)',
    '    $g.DrawString($row.text, $font, $brush, $rect, $format)',
    '    $h = $g.MeasureString($row.text, $font, $innerW).Height',
    '    $y += $h + $gap',
    '  }',
    '  $script:pageIndex++',
    '  $ev.HasMorePages = $script:pageIndex -lt $pageList.Count',
    '})',
    '$doc.Print()',
  ].join('\n');

  const scriptPath = path.join(app.getPath('temp'), `ws-print-${Date.now()}.ps1`);
  fs.writeFileSync(scriptPath, script, 'utf8');
  const timeoutMs = 20000 + pages.length * 12000;

  try {
    await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      { timeout: timeoutMs, windowsHide: true },
    );
    return { method: 'dotnet', printer: printerName, pages: pages.length };
  } finally {
    for (const file of [jsonPath, scriptPath]) {
      try {
        fs.unlinkSync(file);
      } catch {
        /* ignore */
      }
    }
  }
}

async function printOnePage(win, htmlPath, deviceName, settings) {
  await win.loadFile(htmlPath);
  // loadFile() liefert bereits ein "geladen". Kurzer Tick für stabiles Rendering.
  await new Promise((resolve) => setTimeout(resolve, 120));

  const { pageWidthMm, pageHeightMm, landscape } = labelPageDimensions(settings);
  const pxPerMm = 3.78;
  const winW = Math.round(pageWidthMm * pxPerMm);
  const winH = Math.round(pageHeightMm * pxPerMm);
  win.setContentSize(winW, winH);

  await new Promise((resolve, reject) => {
    const opts = {
      silent: true,
      deviceName,
      printBackground: true,
      landscape,
      preferCSSPageSize: true,
      margins: { marginType: 'none' },
      copies: 1,
      pageSize: {
        width: pageWidthMm * 1000,
        height: pageHeightMm * 1000,
      },
      scaleFactor: 100,
    };

    let done = false;
    const finish = (ok, err) => {
      if (done) {
        return;
      }
      done = true;
      ok ? resolve() : reject(err || new Error('Electron-Druck fehlgeschlagen'));
    };

    const pending = win.webContents.print(opts);
    if (pending && typeof pending.then === 'function') {
      pending.then(() => finish(true)).catch((e) => finish(false, e));
    } else {
      win.webContents.print(opts, (success, reason) => {
        finish(success, new Error(reason || 'Electron-Druck fehlgeschlagen'));
      });
    }

    setTimeout(() => finish(false, new Error('Electron-Druck Timeout')), 45000);
  });
}

async function printViaElectron(pages, deviceName) {
  let win = ensurePrintWindow();
  const logoSrc = logoDataUri();
  const settings = getLabelSettings();
  const tempFiles = [];

  try {
    for (const page of pages) {
      const htmlPath = path.join(app.getPath('temp'), `ws-label-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
      fs.writeFileSync(htmlPath, renderSinglePageHtml(page, logoSrc, settings), 'utf8');
      tempFiles.push(htmlPath);
      let printed = false;
      let lastErr = null;
      for (let attempt = 0; attempt < 2 && !printed; attempt += 1) {
        try {
          await printOnePage(win, htmlPath, deviceName, settings);
          printed = true;
        } catch (err) {
          lastErr = err;
          // Renderer kann nach mehreren Jobs hängen: Fenster neu erzeugen und einmal neu versuchen.
          if (attempt === 0 && !String(err?.message || '').includes('Electron-Druck fehlgeschlagen')) {
            try {
              if (printWindow && !printWindow.isDestroyed()) {
                printWindow.destroy();
              }
            } catch {
              /* ignore */
            }
            printWindow = null;
            win = ensurePrintWindow();
            await preloadPrintWindow();
            continue;
          }
        }
      }
      if (!printed) {
        throw lastErr || new Error('Electron-Druck fehlgeschlagen');
      }
    }
    return { method: 'electron', printer: deviceName, pages: pages.length };
  } finally {
    for (const file of tempFiles) {
      try {
        fs.unlinkSync(file);
      } catch {
        /* ignore */
      }
    }
  }
}

async function printRawPages(pages) {
  const printers = await refreshPrinters();
  const deviceName = resolvePrinterName(printers);
  if (!deviceName) {
    throw new Error('Kein Drucker gefunden. Bitte unter Verwaltung → Drucker wählen.');
  }

  try {
    return await printViaElectron(pages, deviceName);
  } catch (err) {
    if (!ALLOW_DOTNET_FALLBACK) {
      throw new Error(
        `HTML: ${err.message}. DotNet-Fallback ist deaktiviert, damit das Layout exakt der Vorschau entspricht.`,
      );
    }
    try {
      return await printViaDotNet(pages, deviceName);
    } catch (dotnetErr) {
      throw new Error(`HTML: ${err.message} · .NET: ${dotnetErr.message}`);
    }
  }
}

async function printStockAlert(payload) {
  return printRawPages(buildStockAlertLabelPages(payload));
}

async function printLabel(payload) {
  const printers = await refreshPrinters();
  const deviceName = resolvePrinterName(printers);
  if (!deviceName) {
    throw new Error('Kein Drucker gefunden. Bitte unter Verwaltung → Drucker wählen.');
  }

  const pages = buildLabelPages(payload);
  try {
    return await printViaElectron(pages, deviceName);
  } catch (err) {
    if (!ALLOW_DOTNET_FALLBACK) {
      throw new Error(
        `HTML: ${err.message}. DotNet-Fallback ist deaktiviert, damit das Layout exakt der Vorschau entspricht.`,
      );
    }
    try {
      return await printViaDotNet(pages, deviceName);
    } catch (dotnetErr) {
      throw new Error(`HTML: ${err.message} · .NET: ${dotnetErr.message}`);
    }
  }
}

function startServer() {
  const server = http.createServer(async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

    try {
      if (req.method === 'GET' && url.pathname === '/health') {
        lastWebPing = Date.now();
        // /health antwortet IMMER sofort mit gecachter Druckerliste — niemals inline
        // getPrintersAsync (das kann 1–3 s dauern und die Webseite „getrennt“ anzeigen).
        // Bei veralteter Liste im Hintergrund aktualisieren (ohne zu warten).
        if (!isPrinting && Date.now() - printersCachedAt > 45000) {
          void refreshPrinters().catch(() => {});
        }
        const printers = cachedPrinters;
        pruneRecentPrints();
        sendJson(res, 200, {
          ok: true,
          version: VERSION,
          printer: selectedPrinter || resolvePrinterName(printers),
          printers: printers.map((p) => p.name),
          lastPrintError,
          lastPrintOk,
          printing: isPrinting,
          recentPrints: recentPrints.slice(-100),
        });
        updateTray();
        return;
      }

      if (req.method === 'GET' && url.pathname === '/printers') {
        const printers = await refreshPrinters(true);
        sendJson(res, 200, { printers: printers.map((p) => p.name) });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/printer') {
        const body = await readBody(req);
        if (!body.name) {
          sendJson(res, 400, { ok: false, error: 'Kein Druckername' });
          return;
        }
        savePrinter(body.name);
        printersCachedAt = 0;
        sendJson(res, 200, { ok: true, printer: body.name });
        updateTray();
        return;
      }

      if (req.method === 'GET' && url.pathname === '/label-settings') {
        sendJson(res, 200, { ok: true, settings: getLabelSettings() });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/label-settings') {
        const body = await readBody(req);
        if (!body.settings) {
          sendJson(res, 400, { ok: false, error: 'Keine Einstellungen' });
          return;
        }
        saveLabelSettings(body.settings);
        sendJson(res, 200, { ok: true, settings: getLabelSettings() });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/print/test') {
        const body = await readBody(req);
        isPrinting = true;
        try {
          const result = await runExclusive(() =>
            printLabel({
              orderId: 'TEST-DRUCK',
              customer: 'Weißer Schäfer Test',
              createdAt: new Date().toISOString(),
              lines: [{ qty: 1, name: 'Testzeile Etikett' }],
              note: body.note || 'Wenn Sie das lesen, funktioniert der Druck.',
            }),
          );
          lastPrintError = null;
          lastPrintOk = new Date().toISOString();
          sendJson(res, 200, { ok: true, ...result });
        } catch (err) {
          lastPrintError = err.message || 'Testdruck fehlgeschlagen';
          sendJson(res, 500, { ok: false, error: lastPrintError });
        } finally {
          isPrinting = false;
          updateTray();
        }
        return;
      }

      if (req.method === 'POST' && url.pathname === '/print/pages') {
        const body = await readBody(req);
        if (!Array.isArray(body.pages) || !body.pages.length) {
          sendJson(res, 400, { ok: false, error: 'Keine Seiten zum Drucken' });
          return;
        }
        isPrinting = true;
        try {
          const result = await runExclusive(() => printRawPages(body.pages));
          lastPrintError = null;
          lastPrintOk = new Date().toISOString();
          sendJson(res, 200, { ok: true, ...result });
        } catch (err) {
          lastPrintError = err.message || 'Druck fehlgeschlagen';
          sendJson(res, 500, { ok: false, error: lastPrintError });
        } finally {
          isPrinting = false;
          updateTray();
        }
        return;
      }

      if (req.method === 'POST' && url.pathname === '/print/stock-alert') {
        const body = await readBody(req);
        isPrinting = true;
        try {
          const result = await runExclusive(() => printStockAlert(body));
          lastPrintError = null;
          lastPrintOk = new Date().toISOString();
          sendJson(res, 200, { ok: true, ...result });
        } catch (err) {
          lastPrintError = err.message || 'Lager-Etikett fehlgeschlagen';
          sendJson(res, 500, { ok: false, error: lastPrintError });
        } finally {
          isPrinting = false;
          updateTray();
        }
        return;
      }

      if (req.method === 'POST' && url.pathname === '/print') {
        const body = await readBody(req);
        const isStockAlert = Array.isArray(body.items)
          ? body.items.length > 0
          : body.productId && body.productName;

        // Idempotenz NUR für echte Bestellungen (Lagerwarnungen ausgenommen).
        if (!isStockAlert) {
          const dup = findDuplicatePrint(body.orderId, body.jobId, body.force === true);
          if (dup) {
            sendJson(res, 200, {
              ok: true,
              deduped: true,
              printer: selectedPrinter || null,
              pages: 0,
            });
            updateTray();
            return;
          }
        }

        // WICHTIG: VOR dem Druck reservieren → blockt gleichzeitige Doppelanfragen sofort.
        let reserved = false;
        if (!isStockAlert) {
          reservePrint(body.orderId, body.jobId);
          reserved = true;
        }
        isPrinting = true;
        try {
          const result = await runExclusive(() =>
            isStockAlert ? printStockAlert(body) : printLabel(body),
          );
          lastPrintError = null;
          lastPrintOk = new Date().toISOString();
          sendJson(res, 200, { ok: true, ...result });
        } catch (err) {
          // Nur bei SICHEREM Fehlschlag Reservierung zurücknehmen.
          // Bei Timeout/unsicherem Ausgang NICHT freigeben (verhindert Doppeldruck).
          if (reserved && !isUncertainPrintError(err)) {
            unreservePrint(body.orderId, body.jobId);
          }
          lastPrintError = err.message || 'Druck fehlgeschlagen';
          sendJson(res, 500, { ok: false, error: lastPrintError });
        } finally {
          isPrinting = false;
          updateTray();
        }
        return;
      }

      if (req.method === 'POST' && url.pathname === '/ping-web') {
        lastWebPing = Date.now();
        sendJson(res, 200, { ok: true });
        return;
      }

      sendJson(res, 404, { ok: false, error: 'not found' });
    } catch (err) {
      sendJson(res, 500, { ok: false, error: err.message || 'error' });
    }
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`WS Label Print listening on ${PORT}`);
  });
}

function updateTray() {
  if (!tray) {
    return;
  }
  const connected = Date.now() - lastWebPing < 30000;
  const status = lastPrintError
    ? `\nFehler: ${lastPrintError}`
    : lastPrintOk
      ? '\nLetzter Druck: OK'
      : '';
  tray.setToolTip(
    `WS Etikettendruck v${VERSION}\nPort ${PORT}\nDrucker: ${selectedPrinter || 'automatisch'}\nWeb: ${connected ? 'verbunden' : 'warte'}${status}`,
  );
}

function createTray() {
  tray = new Tray(buildTrayIcon());
  tray.setToolTip('WS Etikettendruck');
  updateTray();
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Testdruck senden',
      click: () => {
        printLabel({
          orderId: 'TRAY-TEST',
          customer: 'Tray-Test',
          createdAt: new Date().toISOString(),
          lines: [{ qty: 1, name: 'Test aus Tray-Menü' }],
        })
          .then(() => {
            lastPrintError = null;
            lastPrintOk = new Date().toISOString();
            updateTray();
          })
          .catch((e) => {
            lastPrintError = e.message;
            updateTray();
          });
      },
    },
    { type: 'separator' },
    {
      label: 'Demo im Browser öffnen',
      click: () => shell.openExternal(`https://${DEMO_URL_HINT}`),
    },
    {
      label: 'Lokal testen (localhost)',
      click: () => shell.openExternal('http://localhost:4200/demo/weisser-schaefer/verwaltung'),
    },
    { type: 'separator' },
    {
      label: 'Beenden',
      click: () => app.quit(),
    },
  ]);
  tray.setContextMenu(contextMenu);
}

if (process.platform === 'win32') {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    const url = argv.find((a) => a.startsWith(`${PROTOCOL}://`));
    if (url) {
      lastWebPing = Date.now();
      updateTray();
    }
  });

  app.whenReady().then(async () => {
    loadPrinter();
    loadLabelSettings();
    loadRecentPrints();
    await preloadPrintWindow();
    await refreshPrinters(true);
    startServer();
    createTray();
    setInterval(updateTray, 5000);
  });

  app.on('window-all-closed', (e) => e.preventDefault());

  app.on('open-url', (e) => {
    e.preventDefault();
    lastWebPing = Date.now();
    updateTray();
  });
}
