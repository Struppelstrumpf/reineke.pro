export type WsAlertTime = string;

export type WsInventorySettings = {
  alertsEnabled: boolean;
  alertTimes: WsAlertTime[];
  lastCombinedAlertAt?: string;
  /** Gedruckte Zeitfenster, z. B. „2026-06-25:07:00“ */
  printedAlertSlots?: string[];
};

export type WsProductStockEntry = {
  quantity: number;
  alertThreshold: number;
};

export type WsInventoryState = {
  settings: WsInventorySettings;
  stock: Record<string, WsProductStockEntry>;
};

export { type WsStockAlertItem, type WsStockAlertPrintPayload } from './ws-stock-alert.types';

export const WS_INVENTORY_KEY = 'ws-demo-inventory';

export const WS_DEFAULT_ALERT_TIMES: ReadonlyArray<WsAlertTime> = ['07:00'];

/** @deprecated Nur noch für Migration aus älteren Demo-Daten */
export type WsStockAlertInterval = 'daily' | '3h' | '6h' | '12h';

type LegacySettings = Partial<WsInventorySettings> & { alertInterval?: WsStockAlertInterval };

export function normalizeAlertTime(value: string): WsAlertTime | null {
  const trimmed = value.trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function normalizeAlertTimes(values: readonly string[]): WsAlertTime[] {
  const unique = new Set<WsAlertTime>();
  for (const value of values) {
    const normalized = normalizeAlertTime(value);
    if (normalized) {
      unique.add(normalized);
    }
  }
  return [...unique].sort();
}

export function wsAlertSlotKey(date: Date, time: WsAlertTime): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}:${time}`;
}

export function wsSlotDateTime(date: Date, time: WsAlertTime): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const slot = new Date(date);
  slot.setHours(hours, minutes, 0, 0);
  return slot;
}

export function wsDueUnprintedAlertSlots(
  alertTimes: readonly WsAlertTime[],
  printedSlots: readonly string[] | undefined,
  now = new Date(),
): WsAlertTime[] {
  const normalized = normalizeAlertTimes(alertTimes);
  if (!normalized.length) {
    return [];
  }

  const printed = new Set(printedSlots ?? []);
  const due: WsAlertTime[] = [];

  for (const time of normalized) {
    if (now.getTime() < wsSlotDateTime(now, time).getTime()) {
      continue;
    }
    if (!printed.has(wsAlertSlotKey(now, time))) {
      due.push(time);
    }
  }

  return due;
}

export function wsPrunePrintedAlertSlots(
  printedSlots: readonly string[] | undefined,
  now = new Date(),
): string[] {
  const todayPrefix = wsAlertSlotKey(now, '00:00').slice(0, 10);
  return [...new Set(printedSlots ?? [])].filter((key) => key.startsWith(todayPrefix));
}

export function wsMigrateInventorySettings(raw: LegacySettings): WsInventorySettings {
  let alertTimes = normalizeAlertTimes(raw.alertTimes ?? []);
  if (!alertTimes.length) {
    switch (raw.alertInterval) {
      case '3h':
        alertTimes = normalizeAlertTimes(['06:00', '09:00', '12:00', '15:00', '18:00', '21:00']);
        break;
      case '6h':
        alertTimes = normalizeAlertTimes(['06:00', '12:00', '18:00']);
        break;
      case '12h':
        alertTimes = normalizeAlertTimes(['07:00', '19:00']);
        break;
      default:
        alertTimes = [...WS_DEFAULT_ALERT_TIMES];
    }
  }

  return {
    alertsEnabled: raw.alertsEnabled ?? false,
    alertTimes,
    lastCombinedAlertAt: raw.lastCombinedAlertAt,
    printedAlertSlots: wsPrunePrintedAlertSlots(raw.printedAlertSlots),
  };
}

export function wsFormatAlertTimesLabel(times: readonly WsAlertTime[]): string {
  const normalized = normalizeAlertTimes(times);
  if (!normalized.length) {
    return 'keine Uhrzeit hinterlegt';
  }
  return normalized.join(', ');
}
