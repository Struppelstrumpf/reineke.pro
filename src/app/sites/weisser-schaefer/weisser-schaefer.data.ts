export type WsOrderLine = {
  productId: string;
  name: string;
  qty: number;
  unit: string;
};

export type WsOrderPrintState = 'idle' | 'printing' | 'printed';

export type WsOrder = {
  id: string;
  customer: string;
  customerAddress?: string;
  customerPhone?: string;
  createdAt: string;
  status: 'neu' | 'in Bearbeitung' | 'versendet';
  lines: WsOrderLine[];
  note?: string;
  /** Zeitpunkt des bestätigten Etikettendrucks (Antwort der App ODER Reconcile) */
  printedAt?: string;
  /** Eindeutige ID des letzten Druckauftrags — für Idempotenz/Abgleich mit der App */
  printJobId?: string;
  /** Expliziter Druckzustand (intern, für Race-Schutz) */
  printState?: WsOrderPrintState;
  /** Beginn des aktuell laufenden Druckversuchs (Stale-Erkennung) */
  printingSince?: string;
  /**
   * Ein Druckauftrag wurde an die App GESENDET, dessen Ausgang aber unbekannt
   * (z. B. Timeout). Solange gesetzt, wird NIE blind erneut gedruckt → kein Doppeldruck.
   * Wird gelöscht bei bestätigtem Druck ODER bei sicherem Fehlschlag (nicht gedruckt).
   */
  printDispatchedAt?: string;
  /** Letzter (auch fehlgeschlagener) Druckversuch — für Retry-Cooldown */
  lastPrintAttemptAt?: string;
  /** @deprecated nur noch für Migration alter Demo-Daten */
  autoPrintAt?: string;
  archivedAt?: string;
};

/** Ein „laufender“ Druckversuch gilt nach so vielen ms als abgebrochen/verloren. */
export const WS_PRINT_STALE_MS = 120_000;

/** Nach einem fehlgeschlagenen Versuch erst nach dieser Zeit erneut automatisch versuchen. */
export const WS_PRINT_RETRY_COOLDOWN_MS = 30_000;

export function wsOrderIsPrinting(
  order: Pick<WsOrder, 'printState' | 'printingSince'>,
  now: number = Date.now(),
): boolean {
  if (order.printState !== 'printing' || !order.printingSince) {
    return false;
  }
  return now - new Date(order.printingSince).getTime() < WS_PRINT_STALE_MS;
}

/** Status-Bezeichnung für Mitarbeiter/Admin. */
export function wsOrderStatusOptionLabel(
  _order: Pick<WsOrder, 'status' | 'printedAt'>,
  status: WsOrder['status'],
): string {
  if (status === 'neu') {
    return 'Neu';
  }
  if (status === 'in Bearbeitung') {
    return 'In Bearbeitung';
  }
  return 'Versendet';
}

/** Status-Bezeichnung für Kunden — nur „In Bearbeitung“ und „Versendet“. */
export function wsOrderCustomerStatusLabel(order: Pick<WsOrder, 'status'>): string {
  if (order.status === 'versendet') {
    return 'Versendet';
  }
  return 'In Bearbeitung';
}

/** Erlaubte manuelle Status-Wechsel — „Neu“ ist nicht rücksetzbar. */
export function wsOrderStaffStatusOptions(currentStatus: WsOrder['status']): ReadonlyArray<WsOrder['status']> {
  if (currentStatus === 'neu') {
    return ['neu', 'in Bearbeitung', 'versendet'];
  }
  if (currentStatus === 'in Bearbeitung') {
    return ['in Bearbeitung', 'versendet'];
  }
  return ['versendet'];
}

/**
 * Eine Bestellung wird automatisch gedruckt, solange sie „Neu“ ist.
 * Nach erfolgreichem Druck wird sie auf „In Bearbeitung“ gesetzt und fällt damit raus.
 * Während ein Druck läuft oder kurz nach einem Fehlversuch wird nicht erneut angestoßen.
 */
export function wsOrderNeedsAutoPrint(
  order: Pick<
    WsOrder,
    'status' | 'archivedAt' | 'printState' | 'printingSince' | 'printDispatchedAt' | 'lastPrintAttemptAt'
  >,
  now: number = Date.now(),
): boolean {
  if (order.status !== 'neu' || order.archivedAt) {
    return false;
  }
  if (wsOrderIsPrinting(order, now)) {
    return false;
  }
  // Bereits gesendet, Ausgang unbekannt → NIEMALS blind erneut drucken.
  if (order.printDispatchedAt) {
    return false;
  }
  if (
    order.lastPrintAttemptAt &&
    now - new Date(order.lastPrintAttemptAt).getTime() < WS_PRINT_RETRY_COOLDOWN_MS
  ) {
    return false;
  }
  return true;
}

/** Eindeutige, kollisionssichere Druckauftrags-ID. */
export function wsMakePrintJobId(orderId: string): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${orderId}::${Date.now()}::${rand}`;
}

export const WS_SEED_ORDERS: ReadonlyArray<WsOrder> = [
  {
    id: 'WS-24018',
    customer: 'Metzgerei Grünwald',
    createdAt: '2024-06-18T09:12:00',
    status: 'versendet',
    printedAt: '2024-06-18T10:00:00.000Z',
    autoPrintAt: '2024-06-18T10:00:00.000Z',
    archivedAt: '2024-06-18T11:00:00.000Z',
    lines: [
      { productId: 'sd-24', name: 'Schafsdarm Natur 24–26', qty: 4, unit: 'Hank' },
      { productId: 'ld-prem', name: 'Lammdarm Premium', qty: 2, unit: 'Hank' },
    ],
  },
  {
    id: 'WS-24021',
    customer: 'Fleischerei Böhm',
    createdAt: '2024-06-21T14:40:00',
    status: 'in Bearbeitung',
    printedAt: '2024-06-21T14:45:00.000Z',
    autoPrintAt: '2024-06-21T14:45:00.000Z',
    lines: [{ productId: 'sd-28', name: 'Schafsdarm Natur 28–30', qty: 6, unit: 'Hank' }],
    note: 'Abholung Freitag vormittags',
  },
];

export const WS_DEMO_CUSTOMER = 'Fleischerei Muster GmbH';
