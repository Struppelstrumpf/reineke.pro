import { Injectable, signal } from '@angular/core';
import type { WsOrder } from './weisser-schaefer.data';
import type { WsStockAlertPrintPayload } from './ws-inventory.types';
import { buildStockAlertLabelPages } from './ws-stock-alert-label';
import type { WsLabelLine } from './ws-label-layout';
import type { WsLabelPrintSettings } from './ws-label-settings';
import { WS_LABEL_ITEMS_PER_PAGE } from './ws-label-layout';

export const WS_PRINT_API = 'http://127.0.0.1:19284';
export const WS_PRINT_PROTOCOL = 'wslabel';
export const WS_PRINT_MIN_STOCK_VERSION = '1.2.0';
export const WS_PRINT_CONTACT_HEADER_VERSION = '1.4.5';
export const WS_PRINT_APP_DOWNLOAD_URL = 'https://github.com/struppelstrumpf/reineke.pro/releases';
const WS_PRINT_ROUTING_KEY = 'ws-demo-print-routing-v1';

export type WsAgentPrintRecord = { orderId?: string | null; jobId?: string | null; at: string };

export type WsPrintAgentInfo = {
  ok: boolean;
  version: string;
  printer: string | null;
  printers: string[];
  lastPrintError?: string | null;
  lastPrintOk?: string | null;
  recentPrints?: WsAgentPrintRecord[];
};

export type WsPrintResult = {
  ok: boolean;
  error?: string;
  printer?: string;
  method?: string;
  pages?: number;
  /** App hat erkannt, dass dieser Auftrag bereits gedruckt wurde (kein erneuter Druck). */
  deduped?: boolean;
  /**
   * Ausgang UNBEKANNT (Auftrag wurde gesendet, aber keine eindeutige Antwort —
   * z. B. Timeout). Sicherheitshalber NICHT erneut drucken.
   * false = sicher NICHT gedruckt (z. B. App nicht erreichbar / expliziter Fehler) → Retry ok.
   */
  uncertain?: boolean;
};

export type WsPrintRoutingSettings = {
  mainPrinter?: string;
  orderPrinter?: string;
  stockAlertPrinter?: string;
  appDownloadUrl?: string;
};

function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    window.clearTimeout(timer),
  );
}

export function wsPrintVersionAtLeast(version: string | null | undefined, minimum: string): boolean {
  if (!version) {
    return false;
  }
  const current = version.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const target = minimum.split('.').map((part) => Number.parseInt(part, 10) || 0);
  for (let index = 0; index < Math.max(current.length, target.length); index += 1) {
    const left = current[index] ?? 0;
    const right = target[index] ?? 0;
    if (left > right) {
      return true;
    }
    if (left < right) {
      return false;
    }
  }
  return true;
}

@Injectable({ providedIn: 'root' })
export class WeisserSchaeferPrintService {
  readonly connected = signal(false);
  readonly agent = signal<WsPrintAgentInfo | null>(null);
  readonly lastError = signal<string | null>(null);
  /** Von der App zuletzt nachweislich gedruckte Aufträge (für Status-Abgleich). */
  readonly recentPrints = signal<WsAgentPrintRecord[]>([]);
  readonly routingSettings = signal<WsPrintRoutingSettings>(this.loadRoutingSettings());

  readonly supportsStockLabels = () =>
    wsPrintVersionAtLeast(this.agent()?.version, WS_PRINT_MIN_STOCK_VERSION);

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private readonly onlineCallbacks = new Set<() => void>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.startDiscovery();
      window.addEventListener('focus', () => void this.ping());
    }
  }

  startDiscovery(): void {
    void this.ping();
    if (this.pollTimer) {
      return;
    }
    this.pollTimer = setInterval(() => void this.ping(), 5000);
  }

  onOnline(callback: () => void): () => void {
    this.onlineCallbacks.add(callback);
    if (this.connected()) {
      queueMicrotask(() => {
        if (this.connected()) {
          callback();
        }
      });
    }
    return () => this.onlineCallbacks.delete(callback);
  }

  async ping(): Promise<boolean> {
    const wasConnected = this.connected();
    try {
      const res = await fetchWithTimeout(`${WS_PRINT_API}/health`, { method: 'GET' }, 6000);
      if (!res.ok) {
        throw new Error('offline');
      }
      const data = (await res.json()) as WsPrintAgentInfo;
      this.connected.set(true);
      this.agent.set(data);
      this.lastError.set(data.lastPrintError ?? null);
      if (Array.isArray(data.recentPrints)) {
        this.recentPrints.set(data.recentPrints);
      }
      if (!wasConnected) {
        for (const callback of this.onlineCallbacks) {
          callback();
        }
      }
      return true;
    } catch {
      this.connected.set(false);
      this.agent.set(null);
      return false;
    }
  }

  wakeDesktopApp(): void {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = `${WS_PRINT_PROTOCOL}://wake`;
    document.body.appendChild(iframe);
    window.setTimeout(() => iframe.remove(), 1200);
    window.setTimeout(() => void this.ping(), 1500);
  }

  stockLabelAppError(): string {
    const version = this.agent()?.version ?? '?';
    return `Etiketten-App v${version} ist zu alt für Lagerwarnungen. Bitte WS Etikettendruck ${WS_PRINT_MIN_STOCK_VERSION}+ neu starten (apps/ws-label-print → npm start).`;
  }

  async printOrder(
    order: WsOrder,
    opts?: { jobId?: string; force?: boolean },
  ): Promise<WsPrintResult> {
    if (!this.connected()) {
      const online = await this.ping();
      if (!online) {
        // Auftrag wurde NICHT gesendet → sicher nicht gedruckt → Retry erlaubt.
        return {
          ok: false,
          uncertain: false,
          error: 'Etiketten-App nicht erreichbar. Bitte App starten.',
        };
      }
    }
    const pageCount = Math.max(1, Math.ceil(order.lines.length / WS_LABEL_ITEMS_PER_PAGE));
    const route = await this.ensureTaskPrinter('orders');
    if (!route.ok) {
      return { ok: false, error: route.error };
    }
    const customerAddress = order.customerAddress?.trim() || 'Anschrift nicht hinterlegt';
    const customerPhone = order.customerPhone?.trim() || 'Telefon nicht hinterlegt';
    const supportsContactHeader = wsPrintVersionAtLeast(
      this.agent()?.version,
      WS_PRINT_CONTACT_HEADER_VERSION,
    );
    // Rückwärtskompatibel: ältere App-Versionen kennen noch keine separaten
    // Felder für Anschrift/Telefon auf dem Label-Header.
    const customerLabel = supportsContactHeader
      ? order.customer
      : `${order.customer} · ${customerAddress} · ${customerPhone}`;
    try {
      const res = await fetchWithTimeout(
        `${WS_PRINT_API}/print`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            jobId: opts?.jobId,
            force: opts?.force ?? false,
            customer: customerLabel,
            customerAddress,
            customerPhone,
            lines: order.lines,
            note: order.note,
            createdAt: order.createdAt,
          }),
        },
        // Großzügig, damit ein langsamer Drucker keinen falschen Timeout auslöst.
        60000 + pageCount * 30000,
      );
      const data = (await res.json()) as WsPrintResult;
      if (!res.ok || !data.ok) {
        await this.ping();
        // Die App hat geantwortet und explizit NICHT gedruckt → Retry erlaubt.
        return { ok: false, uncertain: false, error: data.error ?? 'Druck fehlgeschlagen' };
      }
      await this.ping();
      return {
        ok: true,
        printer: data.printer,
        method: data.method,
        pages: data.pages,
        deduped: data.deduped,
      };
    } catch (err) {
      // Auftrag wurde gesendet, aber KEINE eindeutige Antwort (Timeout/Abbruch).
      // Ausgang unbekannt → sicherheitshalber NICHT erneut drucken.
      const msg =
        err instanceof Error && err.name === 'AbortError'
          ? 'Druck dauert ungewöhnlich lange — Status wird abgeglichen.'
          : 'Antwort der Etiketten-App ausgeblieben — Status wird abgeglichen.';
      return { ok: false, uncertain: true, error: msg };
    }
  }

  async printStockAlert(payload: WsStockAlertPrintPayload): Promise<WsPrintResult> {
    if (!payload.items.length) {
      return { ok: false, error: 'Keine Produkte für Lagerwarnung' };
    }

    if (!this.connected()) {
      const online = await this.ping();
      if (!online) {
        return { ok: false, error: 'Etiketten-App nicht erreichbar. Bitte App starten.' };
      }
    }

    if (!this.supportsStockLabels()) {
      return { ok: false, error: this.stockLabelAppError() };
    }
    const route = await this.ensureTaskPrinter('stockAlerts');
    if (!route.ok) {
      return { ok: false, error: route.error };
    }

    const pages = buildStockAlertLabelPages(payload).map((lines) => ({ lines }));
    return this.printLabelPages(pages);
  }

  setTaskPrinter(task: 'orders' | 'stockAlerts', printerName: string | null): void {
    const value = printerName?.trim() || undefined;
    this.routingSettings.update((current) => {
      const next =
        task === 'orders'
          ? { ...current, orderPrinter: value }
          : { ...current, stockAlertPrinter: value };
      this.persistRoutingSettings(next);
      return next;
    });
  }

  setDownloadUrl(url: string): void {
    const normalized = url.trim() || WS_PRINT_APP_DOWNLOAD_URL;
    this.routingSettings.update((current) => {
      const next = { ...current, appDownloadUrl: normalized };
      this.persistRoutingSettings(next);
      return next;
    });
  }

  async printLabelPages(pages: Array<{ lines: WsLabelLine[] }>): Promise<WsPrintResult> {
    if (!pages.length) {
      return { ok: false, error: 'Keine Seiten zum Drucken' };
    }

    try {
      const res = await fetchWithTimeout(
        `${WS_PRINT_API}/print/pages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pages }),
        },
        18000,
      );
      const data = (await res.json()) as WsPrintResult & { error?: string };
      if (res.status === 404 || data.error === 'not found') {
        return { ok: false, error: this.stockLabelAppError() };
      }
      if (!res.ok || !data.ok) {
        await this.ping();
        return { ok: false, error: data.error ?? 'Etikettendruck fehlgeschlagen' };
      }
      await this.ping();
      return { ok: true, printer: data.printer, method: data.method, pages: data.pages };
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'AbortError'
          ? 'Druck dauert zu lange — Drucker prüfen'
          : 'Verbindung zur Etiketten-App unterbrochen';
      return { ok: false, error: msg };
    }
  }

  async testPrint(): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetchWithTimeout(
        `${WS_PRINT_API}/print/test`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
        18000,
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        return { ok: false, error: data.error ?? 'Testdruck fehlgeschlagen' };
      }
      await this.ping();
      return { ok: true };
    } catch {
      return { ok: false, error: 'Testdruck — App nicht erreichbar' };
    }
  }

  async setPrinter(name: string): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(
        `${WS_PRINT_API}/printer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        },
        4000,
      );
      if (!res.ok) {
        return false;
      }
      await this.ping();
      return true;
    } catch {
      return false;
    }
  }

  setMainPrinter(name: string | null): void {
    const normalized = name?.trim() || undefined;
    this.routingSettings.update((current) => {
      if ((current.mainPrinter?.trim() ?? '') === (normalized ?? '')) {
        return current;
      }
      const next = { ...current, mainPrinter: normalized };
      this.persistRoutingSettings(next);
      return next;
    });
  }

  async fetchLabelSettings(): Promise<WsLabelPrintSettings | null> {
    try {
      const res = await fetchWithTimeout(`${WS_PRINT_API}/label-settings`, { method: 'GET' }, 3000);
      if (!res.ok) {
        return null;
      }
      const data = (await res.json()) as { settings?: WsLabelPrintSettings };
      return data.settings ?? null;
    } catch {
      return null;
    }
  }

  async saveLabelSettings(settings: WsLabelPrintSettings): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(
        `${WS_PRINT_API}/label-settings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings }),
        },
        4000,
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  private async ensureTaskPrinter(
    task: 'orders' | 'stockAlerts',
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const target =
      task === 'orders'
        ? this.routingSettings().orderPrinter?.trim()
        : this.routingSettings().stockAlertPrinter?.trim();
    if (!target) {
      return { ok: true };
    }
    const agent = this.agent();
    const knownPrinters = agent?.printers ?? [];
    if (!knownPrinters.includes(target)) {
      await this.ping();
      if (!(this.agent()?.printers ?? []).includes(target)) {
        return { ok: false, error: `Zugewiesener Drucker nicht gefunden: ${target}` };
      }
    }
    if (this.agent()?.printer === target) {
      return { ok: true };
    }
    const ok = await this.setPrinter(target);
    if (!ok) {
      return { ok: false, error: `Drucker konnte nicht gesetzt werden: ${target}` };
    }
    return { ok: true };
  }

  private loadRoutingSettings(): WsPrintRoutingSettings {
    const fallback: WsPrintRoutingSettings = { appDownloadUrl: WS_PRINT_APP_DOWNLOAD_URL };
    if (typeof localStorage === 'undefined') {
      return fallback;
    }
    try {
      const raw = localStorage.getItem(WS_PRINT_ROUTING_KEY);
      if (!raw) {
        return fallback;
      }
      const parsed = JSON.parse(raw) as Partial<WsPrintRoutingSettings>;
      return {
        mainPrinter: parsed.mainPrinter?.trim() || undefined,
        orderPrinter: parsed.orderPrinter?.trim() || undefined,
        stockAlertPrinter: parsed.stockAlertPrinter?.trim() || undefined,
        appDownloadUrl: parsed.appDownloadUrl?.trim() || WS_PRINT_APP_DOWNLOAD_URL,
      };
    } catch {
      return fallback;
    }
  }

  private persistRoutingSettings(settings: WsPrintRoutingSettings): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(WS_PRINT_ROUTING_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage quota errors
    }
  }

}
