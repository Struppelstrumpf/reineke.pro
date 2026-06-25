import { Injectable, computed, inject, signal } from '@angular/core';
import {
  WS_SEED_ORDERS,
  wsMakePrintJobId,
  wsOrderIsPrinting,
  wsOrderNeedsAutoPrint,
  type WsOrder,
  type WsOrderLine,
} from './weisser-schaefer.data';

export type WsAgentPrintRecord = { orderId?: string | null; jobId?: string | null; at: string };
import { WeisserSchaeferAuthService } from './weisser-schaefer-auth.service';
import { WeisserSchaeferCatalogService } from './weisser-schaefer-catalog.service';
import { WeisserSchaeferInventoryService } from './weisser-schaefer-inventory.service';
import {
  wsProductCanOrder,
  wsProductMaxOrderQty,
} from './ws-product-stock';
import {
  buildOrderStatusEmail,
  loadOrderNotifications,
  saveOrderNotifications,
  type WsOrderStatusNotification,
} from './ws-order-status-email';

const ORDERS_KEY = 'ws-demo-orders';

@Injectable({ providedIn: 'root' })
export class WeisserSchaeferSessionService {
  private readonly auth = inject(WeisserSchaeferAuthService);
  private readonly catalog = inject(WeisserSchaeferCatalogService);
  private readonly inventory = inject(WeisserSchaeferInventoryService);

  readonly cart = signal<WsOrderLine[]>([]);
  readonly toast = signal<string | null>(null);
  readonly printOrderId = signal<string | null>(null);
  readonly labelPrintBusy = signal(false);

  private readonly orders = signal<WsOrder[]>(this.loadOrders());
  private readonly notifications = signal<WsOrderStatusNotification[]>(loadOrderNotifications());

  constructor() {
    if (typeof window !== 'undefined') {
      // Cross-Tab-Synchronisation: Änderungen anderer Tabs sofort übernehmen.
      window.addEventListener('storage', (event) => {
        if (event.key === ORDERS_KEY) {
          const fresh = this.readOrdersFromStorage();
          if (fresh) {
            this.orders.set(fresh);
          }
        }
      });
    }
  }

  readonly allOrders = computed(() => this.orders());
  readonly orderNotifications = computed(() => this.notifications());

  readonly activeOrders = computed(() =>
    this.orders().filter((order) => !order.archivedAt),
  );

  readonly archivedOrders = computed(() =>
    [...this.orders()]
      .filter((order) => order.archivedAt)
      .sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? '')),
  );

  readonly unprintedOrders = computed(() =>
    [...this.orders()]
      .filter((order) => wsOrderNeedsAutoPrint(order))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  );

  readonly myOrders = computed(() => {
    const user = this.auth.currentUser();
    if (!user || user.role !== 'customer') {
      return [];
    }
    return [...this.orders()]
      .filter((order) => order.customer === user.companyName)
      .map((order) => this.withCustomerContact(order))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  readonly myNotifications = computed(() => {
    const user = this.auth.currentUser();
    if (!user || user.role !== 'customer') {
      return [];
    }
    return this.notifications()
      .filter((entry) => entry.customerCompany === user.companyName)
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  });

  logout(): void {
    this.auth.logout();
    this.cart.set([]);
  }

  addToCart(line: WsOrderLine): string | null {
    const product = this.catalog.productById(line.productId);
    if (!product) {
      return 'Produkt nicht gefunden.';
    }

    const warehouseQty = this.inventory.quantity(line.productId);
    if (!wsProductCanOrder(product, warehouseQty)) {
      return 'Dieses Produkt ist derzeit nicht bestellbar.';
    }

    const currentQty =
      this.cart().find((item) => item.productId === line.productId)?.qty ?? 0;
    const nextQty = currentQty + line.qty;
    const maxAdd = wsProductMaxOrderQty(product, warehouseQty, currentQty);
    if (maxAdd !== null && line.qty > maxAdd) {
      return maxAdd < 1
        ? 'Maximale Lagermenge bereits im Warenkorb.'
        : `Nur noch ${maxAdd}× bestellbar.`;
    }
    if (maxAdd !== null && nextQty > warehouseQty) {
      return `Nur noch ${warehouseQty}× auf Lager.`;
    }

    this.cart.update((items) => {
      const idx = items.findIndex((i) => i.productId === line.productId);
      if (idx === -1) {
        return [...items, line];
      }
      const next = [...items];
      next[idx] = { ...next[idx], qty: nextQty };
      return next;
    });
    this.showToast('Zum Warenkorb hinzugefügt');
    return null;
  }

  removeFromCart(productId: string): void {
    this.cart.update((items) => items.filter((i) => i.productId !== productId));
  }

  cartTotal(): number {
    return this.cart().reduce((sum, line) => sum + line.qty, 0);
  }

  placeOrder(note?: string): WsOrder | null {
    const user = this.auth.currentUser();
    if (!user || !this.auth.canOrder()) {
      this.showToast('Bestellung erst nach Freigabe möglich');
      return null;
    }
    const lines = this.cart();
    if (!lines.length) {
      return null;
    }

    for (const line of lines) {
      const product = this.catalog.productById(line.productId);
      if (!product) {
        this.showToast('Warenkorb enthält ungültiges Produkt.');
        return null;
      }
      const warehouseQty = this.inventory.quantity(line.productId);
      if (!wsProductCanOrder(product, warehouseQty)) {
        this.showToast(`${product.name} ist nicht mehr bestellbar.`);
        return null;
      }
      if (product.stock === 'Bestand' && line.qty > warehouseQty) {
        this.showToast(`Nur noch ${warehouseQty}× ${product.name} auf Lager.`);
        return null;
      }
    }

    const order: WsOrder = {
      id: this.makeUniqueOrderId(),
      customer: user.companyName,
      customerAddress: user.address?.trim() || undefined,
      customerPhone: user.phone?.trim() || undefined,
      createdAt: new Date().toISOString(),
      status: 'neu',
      lines: lines.map((l) => ({ ...l })),
      note: note?.trim() || undefined,
    };
    this.mutateOrders((list) => [order, ...list]);

    for (const line of lines) {
      const product = this.catalog.productById(line.productId);
      if (product?.stock === 'Bestand') {
        this.inventory.deductStock(line.productId, line.qty);
      }
    }

    this.cart.set([]);
    this.sendStatusNotification(order);
    this.showToast(`Bestellung ${order.id} eingegangen`);
    return order;
  }

  openPrint(orderId: string): void {
    this.printOrderId.set(orderId);
  }

  closePrint(): void {
    this.printOrderId.set(null);
  }

  orderById(id: string): WsOrder | undefined {
    const order = this.orders().find((o) => o.id === id);
    return order ? this.withCustomerContact(order) : undefined;
  }

  updateOrderStatus(id: string, status: WsOrder['status']): boolean {
    const previous = this.orderById(id);
    if (!previous || previous.status === status) {
      return false;
    }
    if (status === 'neu' && previous.status !== 'neu') {
      this.showToast('Status kann nicht auf Neu zurückgesetzt werden.');
      return false;
    }

    const stamp = new Date().toISOString();
    let updated: WsOrder | null = null;
    this.mutateOrders((list) =>
      list.map((order) => {
        if (order.id !== id) {
          return order;
        }
        const next: WsOrder = { ...order, status };
        if (status === 'versendet') {
          next.archivedAt = order.archivedAt ?? stamp;
        } else {
          next.archivedAt = undefined;
        }
        updated = next;
        return next;
      }),
    );

    const mailed = updated ? this.sendStatusNotification(updated) : false;

    if (status === 'versendet') {
      this.showToast(
        mailed
          ? `Bestellung ${id} archiviert · Status-E-Mail gesendet`
          : `Bestellung ${id} ins Archiv verschoben`,
      );
    } else if (mailed) {
      this.showToast(`Status aktualisiert · E-Mail an Kunde gesendet`);
    }

    return mailed;
  }

  restoreOrder(id: string): void {
    const previous = this.orderById(id);
    if (!previous) {
      return;
    }

    let updated: WsOrder | null = null;
    this.mutateOrders((list) =>
      list.map((order) => {
        if (order.id !== id) {
          return order;
        }
        updated = { ...order, status: 'in Bearbeitung' as const, archivedAt: undefined };
        return updated;
      }),
    );
    if (updated) {
      this.sendStatusNotification(updated);
    }
    this.showToast(`Bestellung ${id} wiederhergestellt`);
  }

  /**
   * Reserviert einen Druckauftrag ATOMAR (read-merge-write gegen Storage).
   * Ändert NICHT den Bestellstatus — das passiert erst nach bestätigtem Druck.
   * Gibt eine eindeutige jobId zurück oder null, wenn nicht gedruckt werden darf.
   */
  claimOrderForPrint(id: string, mode: 'auto' | 'manual'): string | null {
    let jobId: string | null = null;
    this.mutateOrders((list) =>
      list.map((order) => {
        if (order.id !== id) {
          return order;
        }
        if (wsOrderIsPrinting(order)) {
          return order; // läuft bereits — nicht doppelt anstoßen
        }
        if (mode === 'auto' && !wsOrderNeedsAutoPrint(order)) {
          return order;
        }
        const stamp = new Date().toISOString();
        jobId = wsMakePrintJobId(id);
        return {
          ...order,
          printState: 'printing' as const,
          printingSince: stamp,
          printDispatchedAt: stamp,
          printJobId: jobId,
        };
      }),
    );
    return jobId;
  }

  /**
   * Druck bestätigt (App-Antwort ok ODER Abgleich mit App).
   * Setzt die Bestellung von „Neu“ auf „In Bearbeitung“ — der einzige Ort, der das tut.
   */
  confirmOrderPrinted(id: string, jobId?: string): void {
    this.mutateOrders((list) =>
      list.map((order) => {
        if (order.id !== id) {
          return order;
        }
        const stamp = new Date().toISOString();
        return {
          ...order,
          status: order.status === 'neu' ? ('in Bearbeitung' as const) : order.status,
          printedAt: order.printedAt ?? stamp,
          printState: 'printed' as const,
          printingSince: undefined,
          printDispatchedAt: undefined,
          printJobId: jobId ?? order.printJobId,
        };
      }),
    );
  }

  /**
   * Druck fehlgeschlagen — Reservierung freigeben.
   * - retryable=true  → sicher NICHT gedruckt: für erneuten Auto-Versuch freigeben.
   * - retryable=false → Ausgang UNBEKANNT: „dispatched“ bleibt gesetzt, KEIN Auto-Re-Druck.
   */
  releaseOrderPrint(id: string, jobId: string, retryable: boolean): void {
    this.mutateOrders((list) =>
      list.map((order) => {
        if (order.id !== id || order.printedAt) {
          return order;
        }
        if (order.printJobId && order.printJobId !== jobId) {
          return order; // ein neuerer Versuch existiert bereits
        }
        const stamp = new Date().toISOString();
        if (retryable) {
          return {
            ...order,
            printState: 'idle' as const,
            printingSince: undefined,
            printDispatchedAt: undefined,
            lastPrintAttemptAt: stamp,
          };
        }
        // Unbekannt: gesendet, aber keine Bestätigung → nicht erneut drucken.
        return {
          ...order,
          printState: 'idle' as const,
          printingSince: undefined,
          lastPrintAttemptAt: stamp,
        };
      }),
    );
  }

  /**
   * Gleicht den tatsächlichen Druck-Status der Etiketten-App ab.
   * Hat die App eine Bestellung nachweislich gedruckt, wird sie auf „In Bearbeitung“
   * gesetzt — selbst wenn die HTTP-Antwort verloren ging. Verhindert Doppeldruck.
   */
  reconcilePrintedFromAgent(recent: readonly WsAgentPrintRecord[] | null | undefined): void {
    if (!recent || !recent.length) {
      return;
    }
    // NUR über die global eindeutige jobId abgleichen — niemals über die kurze
    // Bestell-Nr (die sich im 24h-Log der App wiederholen kann → Fehlmarkierung).
    const printedJobs = new Set(recent.map((r) => r.jobId).filter((v): v is string => !!v));

    const isMatch = (o: WsOrder): boolean =>
      !o.printedAt && !!o.printJobId && printedJobs.has(o.printJobId);

    if (!this.orders().some(isMatch)) {
      return;
    }

    this.mutateOrders((list) =>
      list.map((order) => {
        if (!isMatch(order)) {
          return order;
        }
        return {
          ...order,
          status: order.status === 'neu' ? ('in Bearbeitung' as const) : order.status,
          printedAt: new Date().toISOString(),
          printState: 'printed' as const,
          printingSince: undefined,
          printDispatchedAt: undefined,
        };
      }),
    );
  }

  isOrderPrinted(id: string): boolean {
    return Boolean(this.orderById(id)?.printedAt);
  }

  /** Eindeutige Bestell-Nr — kollidiert nicht mit bestehenden Bestellungen. */
  private makeUniqueOrderId(): string {
    const existing = new Set((this.readOrdersFromStorage() ?? this.orders()).map((o) => o.id));
    let n = Date.now() % 1000000;
    let id = `WS-${String(n).padStart(6, '0')}`;
    while (existing.has(id)) {
      n = (n + 1) % 1000000;
      id = `WS-${String(n).padStart(6, '0')}`;
    }
    return id;
  }

  showToast(message: string): void {
    this.toast.set(message);
    window.setTimeout(() => this.toast.set(null), 4200);
  }

  notificationsForOrder(orderId: string): WsOrderStatusNotification[] {
    return this.myNotifications().filter((entry) => entry.orderId === orderId);
  }

  private sendStatusNotification(order: WsOrder): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const customerEmail = this.findCustomerEmail(order.customer);
    if (!customerEmail) {
      return false;
    }

    const accountUrl = `${window.location.origin}/demo/weisser-schaefer/konto`;
    const mail = buildOrderStatusEmail({ order, customerEmail, accountUrl });
    const next = [mail, ...this.notifications()].slice(0, 100);
    this.notifications.set(next);
    saveOrderNotifications(next);

    const user = this.auth.currentUser();
    if (user?.role === 'customer' && user.companyName === order.customer) {
      this.showToast(`Neue E-Mail: ${mail.subject}`);
    }

    return true;
  }

  private findCustomerEmail(companyName: string): string | null {
    this.auth.reloadUsersFromStorage();
    const user = this.auth
      .allUsers()
      .find((entry) => entry.role === 'customer' && entry.companyName === companyName);
    return user?.email ?? null;
  }

  private loadOrders(): WsOrder[] {
    return this.readOrdersFromStorage() ?? WS_SEED_ORDERS.map((order) => ({ ...order }));
  }

  /** Liest die Bestellungen frisch aus dem Storage (Quelle der Wahrheit für alle Tabs). */
  private readOrdersFromStorage(): WsOrder[] | null {
    try {
      let raw = localStorage.getItem(ORDERS_KEY);
      if (!raw) {
        // Migration aus früherer sessionStorage-Variante.
        raw = sessionStorage.getItem(ORDERS_KEY);
        if (raw) {
          localStorage.setItem(ORDERS_KEY, raw);
          sessionStorage.removeItem(ORDERS_KEY);
        }
      }
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as WsOrder[];
      if (!Array.isArray(parsed)) {
        return null;
      }
      return parsed.map((order) => this.normalizeOrder(order));
    } catch {
      return null;
    }
  }

  /**
   * Atomares read-merge-write: liest IMMER den aktuellen Storage-Stand,
   * wendet die Mutation darauf an und schreibt zurück. So gehen parallele
   * Änderungen anderer Tabs (z. B. „gedruckt“) nie verloren.
   */
  private mutateOrders(mutator: (orders: WsOrder[]) => WsOrder[]): void {
    const fresh = this.readOrdersFromStorage() ?? this.orders();
    const next = mutator(fresh.map((order) => ({ ...order })));
    this.orders.set(next);
    this.persistOrders();
  }

  private normalizeOrder(order: WsOrder): WsOrder {
    const customerInfo = this.lookupCustomerContact(order.customer);
    let normalized = {
      ...order,
      customerAddress: order.customerAddress ?? customerInfo.address,
      customerPhone: order.customerPhone ?? customerInfo.phone,
    };
    // Bereits gedruckt → mindestens „In Bearbeitung“ + Endzustand.
    if (normalized.printedAt) {
      normalized = {
        ...normalized,
        status: normalized.status === 'neu' ? 'in Bearbeitung' : normalized.status,
        printState: 'printed',
        printingSince: undefined,
        printDispatchedAt: undefined,
      };
    } else if (normalized.printState === 'printing') {
      // Beim Reload „hängengebliebener“ Druckversuch: Ausgang unbekannt.
      // printDispatchedAt BLEIBT gesetzt → wird NICHT blind erneut gedruckt (kein Doppeldruck).
      normalized = { ...normalized, printState: 'idle', printingSince: undefined };
    }
    if (normalized.status === 'versendet' && !normalized.archivedAt) {
      normalized = { ...normalized, archivedAt: normalized.printedAt ?? normalized.createdAt };
    }
    if (normalized.status !== 'versendet' && normalized.archivedAt) {
      normalized = { ...normalized, archivedAt: undefined };
    }
    return normalized;
  }

  private lookupCustomerContact(companyName: string): { address?: string; phone?: string } {
    const user = this.auth
      .allUsers()
      .find((entry) => entry.role === 'customer' && entry.companyName === companyName);
    return {
      address: user?.address?.trim() || undefined,
      phone: user?.phone?.trim() || undefined,
    };
  }

  private withCustomerContact(order: WsOrder): WsOrder {
    const customerInfo = this.lookupCustomerContact(order.customer);
    const customerAddress = order.customerAddress ?? customerInfo.address;
    const customerPhone = order.customerPhone ?? customerInfo.phone;
    if (customerAddress === order.customerAddress && customerPhone === order.customerPhone) {
      return order;
    }
    return { ...order, customerAddress, customerPhone };
  }

  private persistOrders(): void {
    try {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(this.orders()));
    } catch {
      /* ignore */
    }
  }
}
