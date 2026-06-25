import { Injectable, computed, inject, signal } from '@angular/core';
import { WeisserSchaeferCatalogService } from './weisser-schaefer-catalog.service';
import type {
  WsInventorySettings,
  WsInventoryState,
  WsProductStockEntry,
  WsStockAlertPrintPayload,
} from './ws-inventory.types';
import {
  WS_DEFAULT_ALERT_TIMES,
  WS_INVENTORY_KEY,
  wsDueUnprintedAlertSlots,
  wsMigrateInventorySettings,
  wsPrunePrintedAlertSlots,
  normalizeAlertTimes,
  wsAlertSlotKey,
} from './ws-inventory.types';

const DEFAULT_SETTINGS: WsInventorySettings = {
  alertsEnabled: false,
  alertTimes: [...WS_DEFAULT_ALERT_TIMES],
};

const DEFAULT_THRESHOLD = 5;

export type WsInventoryRow = {
  productId: string;
  productName: string;
  spec: string;
  unit: string;
  categoryName: string;
  quantity: number;
  alertThreshold: number;
  isLow: boolean;
};

@Injectable({ providedIn: 'root' })
export class WeisserSchaeferInventoryService {
  private readonly catalog = inject(WeisserSchaeferCatalogService);
  private readonly settings = signal<WsInventorySettings>(this.loadState().settings);
  private readonly stock = signal<Record<string, WsProductStockEntry>>(this.loadState().stock);

  readonly inventorySettings = computed(() => this.settings());

  readonly rows = computed((): WsInventoryRow[] => {
    const stock = this.stock();
    return this.catalog.sortedCategories().flatMap((category) =>
      this.catalog.productsForCategory(category.id, true).map((product) => {
        const entry = stock[product.id] ?? this.defaultEntry();
        return {
          productId: product.id,
          productName: product.name,
          spec: product.spec,
          unit: product.unit,
          categoryName: category.name,
          quantity: entry.quantity,
          alertThreshold: entry.alertThreshold,
          isLow: entry.quantity <= entry.alertThreshold,
        };
      }),
    );
  });

  readonly lowStockRows = computed(() => this.rows().filter((row) => row.isLow));

  quantity(productId: string): number {
    return this.stock()[productId]?.quantity ?? 0;
  }

  threshold(productId: string): number {
    return this.stock()[productId]?.alertThreshold ?? DEFAULT_THRESHOLD;
  }

  addStock(productId: string, amount: number): string | null {
    if (!Number.isFinite(amount) || amount <= 0) {
      return 'Bitte eine positive Menge eingeben.';
    }
    if (!this.catalog.productById(productId)) {
      return 'Produkt nicht gefunden.';
    }

    const current = this.stock()[productId] ?? this.defaultEntry();
    const nextQuantity = Math.round((current.quantity + amount) * 1000) / 1000;
    const next: WsProductStockEntry = {
      ...current,
      quantity: nextQuantity,
    };

    this.stock.update((map) => ({ ...map, [productId]: next }));
    this.persist();
    this.resetCombinedAlertIfStockOk();
    return null;
  }

  setThreshold(productId: string, threshold: number): string | null {
    if (!Number.isFinite(threshold) || threshold < 0) {
      return 'Bitte einen gültigen Schwellenwert eingeben.';
    }
    if (!this.catalog.productById(productId)) {
      return 'Produkt nicht gefunden.';
    }

    const current = this.stock()[productId] ?? this.defaultEntry();
    const rounded = Math.round(threshold);
    const next: WsProductStockEntry = {
      ...current,
      alertThreshold: rounded,
    };

    this.stock.update((map) => ({ ...map, [productId]: next }));
    this.persist();
    this.resetCombinedAlertIfStockOk();
    return null;
  }

  updateSettings(patch: Partial<WsInventorySettings>): void {
    this.settings.update((current) => ({ ...current, ...patch }));
    this.persist();
  }

  setAlertsEnabled(enabled: boolean): void {
    this.updateSettings({ alertsEnabled: enabled });
  }

  setAlertTimes(times: string[]): void {
    const alertTimes = normalizeAlertTimes(times);
    this.updateSettings({
      alertTimes: alertTimes.length ? alertTimes : [...WS_DEFAULT_ALERT_TIMES],
    });
  }

  alertTimesLabel(): string {
    return this.settings().alertTimes.join(', ');
  }

  stockAlertPayload(rows = this.lowStockRows()): WsStockAlertPrintPayload {
    return {
      items: rows.map((row) => ({
        productId: row.productId,
        productName: row.productName,
        spec: row.spec,
        unit: row.unit,
        quantity: row.quantity,
        threshold: row.alertThreshold,
      })),
    };
  }

  shouldPrintCombinedAlert(now = Date.now()): boolean {
    if (!this.settings().alertsEnabled || this.lowStockRows().length === 0) {
      return false;
    }
    const current = new Date(now);
    return (
      wsDueUnprintedAlertSlots(
        this.settings().alertTimes,
        this.settings().printedAlertSlots,
        current,
      ).length > 0
    );
  }

  /** Reserviert Lagerwarn-Druck sofort — verhindert Doppeldruck bei Reload. */
  claimCombinedAlertForPrint(now = Date.now()): boolean {
    const current = new Date(now);
    const due = wsDueUnprintedAlertSlots(
      this.settings().alertTimes,
      this.settings().printedAlertSlots,
      current,
    );
    if (!this.settings().alertsEnabled || this.lowStockRows().length === 0 || !due.length) {
      return false;
    }

    const printedToday = wsPrunePrintedAlertSlots(this.settings().printedAlertSlots, current);
    const nextSlots = due.map((time) => wsAlertSlotKey(current, time));
    this.updateSettings({
      lastCombinedAlertAt: current.toISOString(),
      printedAlertSlots: [...new Set([...printedToday, ...nextSlots])],
    });
    return true;
  }

  markCombinedAlertPrinted(): void {
    this.updateSettings({ lastCombinedAlertAt: new Date().toISOString() });
  }

  /** Manueller Druck — erledigt fällige Uhrzeit-Fenster für heute mit. */
  markManualCombinedAlertPrinted(now = Date.now()): void {
    const current = new Date(now);
    const due = wsDueUnprintedAlertSlots(
      this.settings().alertTimes,
      this.settings().printedAlertSlots,
      current,
    );
    const printedToday = wsPrunePrintedAlertSlots(this.settings().printedAlertSlots, current);
    const nextSlots = due.map((time) => wsAlertSlotKey(current, time));
    this.updateSettings({
      lastCombinedAlertAt: current.toISOString(),
      printedAlertSlots: [...new Set([...printedToday, ...nextSlots])],
    });
  }

  resetCombinedAlertIfStockOk(): void {
    if (this.lowStockRows().length === 0) {
      this.updateSettings({ lastCombinedAlertAt: undefined, printedAlertSlots: [] });
    }
  }

  deductStock(productId: string, amount: number): string | null {
    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }
    const current = this.stock()[productId] ?? this.defaultEntry();
    if (amount > current.quantity) {
      return 'Nicht genug auf Lager.';
    }
    const nextQuantity = Math.round((current.quantity - amount) * 1000) / 1000;
    this.stock.update((map) => ({
      ...map,
      [productId]: { ...current, quantity: nextQuantity },
    }));
    this.persist();
    this.resetCombinedAlertIfStockOk();
    return null;
  }

  private defaultEntry(): WsProductStockEntry {
    return {
      quantity: 0,
      alertThreshold: DEFAULT_THRESHOLD,
    };
  }

  private loadState(): WsInventoryState {
    try {
      const raw = localStorage.getItem(WS_INVENTORY_KEY);
      if (!raw) {
        return { settings: { ...DEFAULT_SETTINGS }, stock: {} };
      }
      const parsed = JSON.parse(raw) as WsInventoryState;
      return {
        settings: wsMigrateInventorySettings(parsed.settings ?? {}),
        stock: parsed.stock ?? {},
      };
    } catch {
      return { settings: { ...DEFAULT_SETTINGS }, stock: {} };
    }
  }

  private persist(): void {
    const state: WsInventoryState = {
      settings: this.settings(),
      stock: this.stock(),
    };
    localStorage.setItem(WS_INVENTORY_KEY, JSON.stringify(state));
  }
}
