import { Injectable, signal } from '@angular/core';

export type FwConnectivityReason = 'offline' | 'api';

const HEALTH_URL = '/api/health';
const PROBE_TIMEOUT_MS = 5000;

@Injectable({ providedIn: 'root' })
export class FusswerkConnectivityService {
  readonly visible = signal(false);
  readonly reason = signal<FwConnectivityReason>('offline');

  private sessionDismissed = false;

  constructor() {
    if (typeof window === 'undefined') return;

    window.addEventListener('offline', () => {
      this.sessionDismissed = false;
      this.show('offline');
    });

    window.addEventListener('online', () => {
      void this.probeApi().then((ok) => {
        if (ok) this.hide();
      });
    });
  }

  /** Auf der Startseite: Verbindung prüfen und ggf. Hinweis zeigen. */
  async checkForHomepage(): Promise<boolean> {
    this.sessionDismissed = false;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.show('offline');
      return false;
    }

    const ok = await this.probeApi();
    if (ok) {
      this.hide();
      return true;
    }

    this.show('api');
    return false;
  }

  notifyApiUnreachable(): void {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.show('offline');
      return;
    }
    this.show('api');
  }

  dismiss(): void {
    this.sessionDismissed = true;
    this.visible.set(false);
  }

  hide(): void {
    this.visible.set(false);
  }

  private show(reason: FwConnectivityReason): void {
    if (this.sessionDismissed) return;
    this.reason.set(reason);
    this.visible.set(true);
  }

  private async probeApi(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return false;

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    try {
      const res = await fetch(HEALTH_URL, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      window.clearTimeout(timer);
    }
  }
}
