import { effect, Injectable, computed, inject, signal } from '@angular/core';
import { WeisserSchaeferAuthService } from './weisser-schaefer-auth.service';
import { WeisserSchaeferInventoryService } from './weisser-schaefer-inventory.service';
import { WeisserSchaeferPrintService } from './weisser-schaefer-print.service';
import { WeisserSchaeferSessionService } from './weisser-schaefer-session.service';

@Injectable({ providedIn: 'root' })
export class WeisserSchaeferStockAlertService {
  private readonly auth = inject(WeisserSchaeferAuthService);
  private readonly inventory = inject(WeisserSchaeferInventoryService);
  private readonly print = inject(WeisserSchaeferPrintService);
  private readonly session = inject(WeisserSchaeferSessionService);

  private timer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;
  private flushChain: Promise<void> = Promise.resolve();

  readonly enabled = computed(() => this.inventory.inventorySettings().alertsEnabled);
  readonly pendingCount = computed(() =>
    this.enabled() && this.inventory.shouldPrintCombinedAlert() && this.inventory.lowStockRows().length > 0
      ? this.inventory.lowStockRows().length
      : 0,
  );
  readonly isFlushing = signal(false);

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    this.print.onOnline(() => void this.flush());
    this.timer = setInterval(() => void this.flush(), 60_000);

    effect(() => {
      if (this.auth.isStaff() && this.enabled() && this.print.connected()) {
        void this.flush();
      }
    });
  }

  flush(): Promise<void> {
    if (!this.auth.isStaff() || !this.enabled() || !this.print.connected()) {
      return Promise.resolve();
    }
    this.flushChain = this.flushChain.then(() => this.runFlush());
    return this.flushChain;
  }

  private async runFlush(): Promise<void> {
    if (this.flushing) {
      return;
    }

    const payload = this.inventory.stockAlertPayload();
    if (!payload.items.length) {
      return;
    }

    if (!this.inventory.claimCombinedAlertForPrint()) {
      return;
    }

    this.flushing = true;
    this.isFlushing.set(true);

    try {
      const result = await this.print.printStockAlert(payload);
      if (result.ok) {
        this.inventory.markCombinedAlertPrinted();
        const count = payload.items.length;
        this.session.showToast(
          count === 1
            ? 'Lagerwarnung gedruckt (1 Produkt)'
            : `Lagerwarnung gedruckt (${count} Produkte)`,
        );
      } else {
        this.session.showToast(result.error ?? 'Lagerwarnung — Druck fehlgeschlagen');
      }
    } finally {
      this.flushing = false;
      this.isFlushing.set(false);
    }
  }
}
