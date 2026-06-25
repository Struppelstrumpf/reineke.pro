import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { WeisserSchaeferAuthService } from '../weisser-schaefer-auth.service';
import { WeisserSchaeferInventoryService } from '../weisser-schaefer-inventory.service';
import { WeisserSchaeferPrintService } from '../weisser-schaefer-print.service';
import { WeisserSchaeferSessionService } from '../weisser-schaefer-session.service';
import { WeisserSchaeferStockAlertService } from '../weisser-schaefer-stock-alert.service';
import { WsLabelPreviewComponent } from './ws-label-preview.component';
import { buildStockAlertLabelPages } from '../ws-stock-alert-label';

type StockAdjustMode = 'add' | 'remove';
type PendingStockChange = {
  productId: string;
  productName: string;
  mode: StockAdjustMode;
  amount: number;
};

@Component({
  selector: 'pv-ws-inventory-admin',
  imports: [WsLabelPreviewComponent],
  templateUrl: './ws-inventory-admin.component.html',
  styleUrls: ['../ws-shared.scss', './ws-inventory-admin.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WsInventoryAdminComponent {
  readonly auth = inject(WeisserSchaeferAuthService);
  readonly inventory = inject(WeisserSchaeferInventoryService);
  readonly print = inject(WeisserSchaeferPrintService);
  readonly stockAlerts = inject(WeisserSchaeferStockAlertService);
  private readonly session = inject(WeisserSchaeferSessionService);

  readonly addAmounts = signal<Record<string, string>>({});
  readonly adjustModes = signal<Record<string, StockAdjustMode>>({});
  readonly thresholdDrafts = signal<Record<string, string>>({});
  readonly showCombinedPreview = signal(false);
  readonly editingProductId = signal<string | null>(null);
  readonly pendingStockChange = signal<PendingStockChange | null>(null);

  readonly combinedPreviewPages = computed(() => {
    const rows = this.inventory.lowStockRows();
    if (!rows.length) {
      return [];
    }
    return buildStockAlertLabelPages(this.inventory.stockAlertPayload(rows));
  });

  amountFor(productId: string): string {
    return this.addAmounts()[productId] ?? '';
  }

  setAmount(productId: string, value: string): void {
    this.addAmounts.update((map) => ({ ...map, [productId]: value }));
  }

  modeFor(productId: string): StockAdjustMode {
    return this.adjustModes()[productId] ?? 'add';
  }

  setMode(productId: string, mode: StockAdjustMode): void {
    this.adjustModes.update((map) => ({ ...map, [productId]: mode }));
  }

  thresholdFor(productId: string, current: number): string {
    return this.thresholdDrafts()[productId] ?? String(current);
  }

  setThresholdDraft(productId: string, value: string): void {
    this.thresholdDrafts.update((map) => ({ ...map, [productId]: value }));
  }

  isEditing(productId: string): boolean {
    return this.editingProductId() === productId;
  }

  startAdjust(productId: string): void {
    this.editingProductId.set(productId);
  }

  cancelAdjust(): void {
    this.editingProductId.set(null);
  }

  requestStockChange(productId: string, productName: string): void {
    const amount = Number(this.amountFor(productId).replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      this.session.showToast('Bitte eine positive Menge eingeben.');
      return;
    }
    this.pendingStockChange.set({
      productId,
      productName,
      mode: this.modeFor(productId),
      amount,
    });
  }

  closeStockChangeDialog(): void {
    this.pendingStockChange.set(null);
  }

  confirmStockChange(): void {
    const pending = this.pendingStockChange();
    if (!pending) {
      return;
    }
    const err =
      pending.mode === 'add'
        ? this.inventory.addStock(pending.productId, pending.amount)
        : this.inventory.deductStock(pending.productId, pending.amount);
    if (err) {
      this.session.showToast(err);
      return;
    }
    this.setAmount(pending.productId, '');
    this.pendingStockChange.set(null);
    this.editingProductId.set(null);
    this.session.showToast(pending.mode === 'add' ? 'Bestand erhöht' : 'Bestand reduziert');
    void this.stockAlerts.flush();
  }

  saveThreshold(productId: string): void {
    const value = Number(this.thresholdFor(productId, 0).replace(',', '.'));
    const err = this.inventory.setThreshold(productId, value);
    if (err) {
      this.session.showToast(err);
      return;
    }
    this.session.showToast('Schwellenwert gespeichert');
  }

  toggleCombinedPreview(): void {
    this.showCombinedPreview.update((value) => !value);
  }

  printCombinedAlert(): void {
    const payload = this.inventory.stockAlertPayload();
    if (!payload.items.length) {
      this.session.showToast('Keine Produkte unter der Schwelle');
      return;
    }
    void this.print.printStockAlert(payload).then((result) => {
      if (result.ok) {
        this.inventory.markManualCombinedAlertPrinted();
      }
      this.session.showToast(
        result.ok
          ? `Lager-Etikett gedruckt (${payload.items.length} Produkt${payload.items.length === 1 ? '' : 'e'})`
          : (result.error ?? 'Druck fehlgeschlagen'),
      );
    });
  }
}
