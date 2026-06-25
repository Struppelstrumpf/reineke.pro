import { effect, Injectable, computed, inject, signal } from '@angular/core';
import type { WsOrder } from './weisser-schaefer.data';
import { wsOrderNeedsAutoPrint } from './weisser-schaefer.data';
import { WeisserSchaeferAuthService } from './weisser-schaefer-auth.service';
import { WeisserSchaeferPrintService } from './weisser-schaefer-print.service';
import { WeisserSchaeferSessionService } from './weisser-schaefer-session.service';

const AUTO_PRINT_KEY = 'ws-auto-print-enabled';

@Injectable({ providedIn: 'root' })
export class WeisserSchaeferAutoPrintService {
  private readonly auth = inject(WeisserSchaeferAuthService);
  private readonly print = inject(WeisserSchaeferPrintService);
  private readonly session = inject(WeisserSchaeferSessionService);

  readonly enabled = signal(this.loadEnabled());
  readonly flushing = signal(false);

  readonly pendingCount = computed(() =>
    this.auth.isStaff() ? this.session.unprintedOrders().length : 0,
  );

  /** Serielle Abarbeitung — verhindert parallele Doppeldrucke (onOnline + Effekt + Login). */
  private flushChain: Promise<void> = Promise.resolve();

  constructor() {
    this.print.onOnline(() => {
      void this.flushUnprinted();
    });

    // Drucker online + Mitarbeiter aktiv → offene Bestellungen abarbeiten.
    effect(() => {
      if (this.auth.isStaff() && this.enabled() && this.print.connected()) {
        void this.flushUnprinted();
      }
    });

    // Status mit der App abgleichen, sobald neue „recentPrints“ gemeldet werden
    // (übernimmt gedruckte Aufträge auch nach verlorener Antwort).
    effect(() => {
      const recent = this.print.recentPrints();
      if (this.auth.isStaff() && recent.length) {
        this.session.reconcilePrintedFromAgent(recent);
      }
    });

    // Unabhängiger Taktgeber: treibt den Druck verlässlich weiter — auch ohne
    // dass sich Signale ändern. So ist KEIN manuelles Neuladen (F5) nötig.
    if (typeof window !== 'undefined') {
      setInterval(() => {
        if (this.auth.isStaff() && this.enabled() && this.print.connected()) {
          this.session.reconcilePrintedFromAgent(this.print.recentPrints());
          void this.flushUnprinted();
        }
      }, 4000);
    }
  }

  setEnabled(value: boolean): void {
    this.enabled.set(value);
    localStorage.setItem(AUTO_PRINT_KEY, value ? '1' : '0');
    if (value) {
      void this.flushUnprinted();
    }
  }

  async onNewOrder(order: WsOrder): Promise<void> {
    if (!this.enabled() || !wsOrderNeedsAutoPrint(order)) {
      return;
    }
    await this.flushUnprinted();
  }

  flushUnprinted(): Promise<void> {
    if (
      !this.auth.isStaff() ||
      !this.enabled() ||
      !this.print.connected() ||
      this.session.printOrderId() !== null ||
      this.session.labelPrintBusy()
    ) {
      return Promise.resolve();
    }
    this.flushChain = this.flushChain.then(() => this.runFlush());
    return this.flushChain;
  }

  private async runFlush(): Promise<void> {
    if (this.flushing()) {
      return;
    }

    // Erst abgleichen, was die App bereits gedruckt hat — dann erst neu drucken.
    this.session.reconcilePrintedFromAgent(this.print.recentPrints());

    const pending = this.session.unprintedOrders();
    if (!pending.length) {
      return;
    }

    this.flushing.set(true);
    let printed = 0;
    let pages = 0;
    let lastError: string | null = null;

    try {
      for (const order of pending) {
        // Manueller Druck hat Vorrang — Auto-Druck währenddessen pausieren.
        if (this.session.printOrderId() !== null || this.session.labelPrintBusy()) {
          break;
        }

        // Atomar reservieren (cross-tab-sicher). null = darf nicht gedruckt werden.
        const jobId = this.session.claimOrderForPrint(order.id, 'auto');
        if (!jobId) {
          continue;
        }

        const current = this.session.orderById(order.id);
        if (!current) {
          this.session.releaseOrderPrint(order.id, jobId, true);
          continue;
        }

        const result = await this.print.printOrder(current, { jobId });
        if (!result.ok) {
          // retryable = sicher NICHT gedruckt; uncertain = Ausgang unbekannt → kein blinder Re-Druck.
          this.session.releaseOrderPrint(order.id, jobId, result.uncertain !== true);
          lastError = result.error ?? 'Automatischer Druck fehlgeschlagen';
          // NICHT abbrechen — die übrigen Bestellungen trotzdem weiter abarbeiten.
          continue;
        }

        this.session.confirmOrderPrinted(order.id, jobId);
        if (!result.deduped) {
          printed += 1;
          pages += result.pages ?? 1;
        }
      }

      if (printed > 0) {
        const label = pages === 1 ? 'Etikett' : `${pages} Etiketten`;
        const suffix = printed === 1 ? '1 Bestellung' : `${printed} Bestellungen`;
        this.session.showToast(`Automatisch gedruckt: ${label} (${suffix})`);
      } else if (lastError) {
        this.session.showToast(lastError);
      }
    } finally {
      this.flushing.set(false);
    }
  }

  private loadEnabled(): boolean {
    try {
      const raw = localStorage.getItem(AUTO_PRINT_KEY);
      if (raw === '1') {
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  }
}
