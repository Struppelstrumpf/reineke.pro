import { Injectable } from '@angular/core';

/**
 * Zentrale Sync-Schicht zwischen den bestehenden `localStorage`-Keys der
 * Weißer-Schäfer-App und dem Datei-Datenbank-Backend (`/api`).
 *
 * Prinzip (bewusst nicht-invasiv, damit nichts im restlichen Code bricht):
 *  - Beim Start werden die Serverdaten geladen (`hydrate`) und in `localStorage`
 *    geschrieben. Anschließend liest jeder Service wie gewohnt synchron aus
 *    `localStorage` — sieht also die Serverdaten.
 *  - `localStorage.setItem` wird für die bekannten Keys so erweitert, dass jede
 *    Änderung zusätzlich ans Backend geschickt wird (write-through).
 *  - Ein leichtgewichtiges Polling holt Änderungen anderer Geräte und löst die
 *    bereits vorhandenen `storage`-Listener der Services aus.
 *  - Ist das Backend nicht erreichbar, verhält sich alles exakt wie vorher
 *    (reiner localStorage-Betrieb) — die Live-Seite bricht also nie.
 */

const API_BASE = '/api';
const POLL_INTERVAL_MS = 4000;
const PING_TIMEOUT_MS = 1200;
const FETCH_TIMEOUT_MS = 5000;
const WRITE_DEBOUNCE_MS = 250;
const WRITE_COOLDOWN_MS = 2000;

/** Geschäftsdaten, die geräteübergreifend geteilt werden. */
const SYNC_KEYS: readonly string[] = [
  'ws-demo-users',
  'ws-demo-reset-tokens',
  'ws-demo-activation-tokens',
  'ws-demo-orders',
  'ws-order-notifications',
  'ws-customer-invite-notifications',
  'ws-demo-inventory',
  'ws-demo-catalog',
  'ws-demo-support-chat-v1',
  'ws-demo-support-chat-audio-v1',
  'ws-label-print-settings',
  'ws-demo-print-routing-v1',
  'ws-auto-print-enabled',
  'ws-agent-token',
];

const SYNC_KEY_SET = new Set(SYNC_KEYS);

function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

@Injectable({ providedIn: 'root' })
export class WsBackendSyncService {
  private enabled = false;
  private applyingRemote = false;
  private originalSetItem: ((key: string, value: string) => void) | null = null;
  private readonly pending = new Map<string, string>();
  /** Letzter Wert, von dem wir wissen/annehmen, dass der Server ihn hat. */
  private readonly serverSnapshot = new Map<string, string>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastWriteAt = 0;

  /** Wird einmalig beim App-Start aufgerufen (APP_INITIALIZER). */
  async init(): Promise<void> {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    // Write-Through-Patch früh installieren — auch wenn das Backend (noch)
    // offline ist, schadet das nicht (es wird nur bei enabled gesendet).
    this.patchLocalStorage();

    const online = await this.ping();
    if (!online) {
      // Kein Backend → reiner localStorage-Betrieb wie bisher.
      return;
    }
    this.enabled = true;

    await this.hydrate();
    this.startPolling();

    window.addEventListener('beforeunload', () => this.flushNow());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void this.pollOnce();
      }
    });
  }

  private async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        signal: timeoutSignal(PING_TIMEOUT_MS),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private patchLocalStorage(): void {
    const storage = window.localStorage;
    const original = storage.setItem.bind(storage);
    this.originalSetItem = original;
    storage.setItem = (key: string, value: string): void => {
      original(key, value);
      if (!this.applyingRemote && this.enabled && SYNC_KEY_SET.has(key)) {
        this.queueWrite(key, value);
      }
    };
  }

  private queueWrite(key: string, value: string): void {
    this.pending.set(key, value);
    this.serverSnapshot.set(key, value);
    this.lastWriteAt = Date.now();
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flushNow(), WRITE_DEBOUNCE_MS);
    }
  }

  private flushNow(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (!this.pending.size) {
      return;
    }
    const entries = [...this.pending.entries()];
    this.pending.clear();
    this.lastWriteAt = Date.now();
    for (const [key, value] of entries) {
      try {
        void fetch(`${API_BASE}/state/${encodeURIComponent(key)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value }),
          keepalive: true,
        }).catch(() => this.requeue(key, value));
      } catch {
        this.requeue(key, value);
      }
    }
  }

  private requeue(key: string, value: string): void {
    // Nur erneut einreihen, wenn lokal nichts Neueres ansteht.
    if (!this.pending.has(key)) {
      this.pending.set(key, value);
    }
  }

  private async hydrate(): Promise<void> {
    const values = await this.fetchState();
    if (!values) {
      return;
    }
    this.applyRemote(values, true);
  }

  private startPolling(): void {
    this.pollTimer = setInterval(() => void this.pollOnce(), POLL_INTERVAL_MS);
  }

  private async pollOnce(): Promise<void> {
    if (!this.enabled) {
      return;
    }
    // Nicht anwenden, solange eigene Writes anstehen oder gerade rausgingen.
    if (this.pending.size || Date.now() - this.lastWriteAt < WRITE_COOLDOWN_MS) {
      return;
    }
    const values = await this.fetchState();
    if (values) {
      this.applyRemote(values, false);
    }
  }

  private async fetchState(): Promise<Record<string, string> | null> {
    try {
      const res = await fetch(`${API_BASE}/state`, { signal: timeoutSignal(FETCH_TIMEOUT_MS) });
      if (!res.ok) {
        return null;
      }
      const data = (await res.json()) as { values?: Record<string, string> };
      return data.values ?? {};
    } catch {
      return null;
    }
  }

  private applyRemote(values: Record<string, string>, isInitial: boolean): void {
    this.applyingRemote = true;
    try {
      for (const key of SYNC_KEYS) {
        const incoming = values[key];
        const localNow = window.localStorage.getItem(key);

        if (incoming === undefined) {
          // Server kennt diesen Key noch nicht → mit lokalem Wert seeden.
          if (isInitial && localNow != null) {
            this.queueWrite(key, localNow);
          }
          continue;
        }

        if (incoming === localNow) {
          this.serverSnapshot.set(key, incoming);
          continue;
        }

        // Beim Polling nur übernehmen, wenn der Server sich seit unserem
        // letzten bekannten Stand wirklich geändert hat (verhindert Flackern
        // durch noch nicht angekommene eigene Writes).
        if (!isInitial && incoming === this.serverSnapshot.get(key)) {
          continue;
        }

        this.applyValue(key, incoming);
        this.serverSnapshot.set(key, incoming);
      }
    } finally {
      this.applyingRemote = false;
    }
  }

  private applyValue(key: string, value: string): void {
    const original = this.originalSetItem ?? window.localStorage.setItem.bind(window.localStorage);
    original(key, value);
    // Vorhandene Service-Listener auslösen (sie lauschen auf 'storage').
    window.dispatchEvent(new StorageEvent('storage', { key, newValue: value }));
    if (key === 'ws-demo-users') {
      window.dispatchEvent(new CustomEvent('ws-users-updated'));
    }
  }
}
