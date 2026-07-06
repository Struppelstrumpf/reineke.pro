import type { FwDaySchedule, FwHourRow, FwOpeningHoursSchedule, FwTimeRange } from './fusswerk-content.types';

export const FW_WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const FW_WEEKDAY_LABELS: Record<number, string> = {
  0: 'Sonntag',
  1: 'Montag',
  2: 'Dienstag',
  3: 'Mittwoch',
  4: 'Donnerstag',
  5: 'Freitag',
  6: 'Samstag',
};

export const FW_WEEKDAY_SHORT: Record<number, string> = {
  0: 'So',
  1: 'Mo',
  2: 'Di',
  3: 'Mi',
  4: 'Do',
  5: 'Fr',
  6: 'Sa',
};

const DAY_NAMES: Record<string, number> = {
  montag: 1,
  mo: 1,
  dienstag: 2,
  di: 2,
  mittwoch: 3,
  mi: 3,
  donnerstag: 4,
  do: 4,
  freitag: 5,
  fr: 5,
  samstag: 6,
  sa: 6,
  sonntag: 0,
  so: 0,
};

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const FW_TIME_OPTIONS: string[] = (() => {
  const options: string[] = [];
  for (let m = 6 * 60; m <= 22 * 60; m += 15) {
    options.push(minutesToTime(m));
  }
  return options;
})();

export function defaultOpeningHours(): FwOpeningHoursSchedule {
  return [
    { weekday: 1, closed: false, ranges: [{ from: '09:00', to: '18:00' }] },
    { weekday: 2, closed: false, ranges: [{ from: '09:00', to: '18:00' }] },
    { weekday: 3, closed: false, ranges: [{ from: '09:00', to: '18:00' }] },
    { weekday: 4, closed: false, ranges: [{ from: '09:00', to: '18:00' }] },
    { weekday: 5, closed: false, ranges: [{ from: '09:00', to: '18:00' }] },
    { weekday: 6, closed: false, ranges: [{ from: '09:00', to: '14:00' }] },
    { weekday: 0, closed: true, ranges: [] },
  ];
}

export function cloneOpeningHours(schedule: FwOpeningHoursSchedule): FwOpeningHoursSchedule {
  return schedule.map((day) => ({
    ...day,
    ranges: day.ranges.map((r) => ({ ...r })),
  }));
}

export function normalizeOpeningHours(raw: FwOpeningHoursSchedule | undefined): FwOpeningHoursSchedule {
  const byWeekday = new Map((raw ?? []).map((d) => [d.weekday, d]));
  return FW_WEEKDAY_ORDER.map((weekday) => {
    const day = byWeekday.get(weekday);
    if (!day) return { weekday, closed: true, ranges: [] };
    const ranges = (day.ranges ?? [])
      .map((r) => ({ from: r.from, to: r.to }))
      .filter((r) => timeToMinutes(r.to) > timeToMinutes(r.from))
      .sort((a, b) => timeToMinutes(a.from) - timeToMinutes(b.from));
    if (day.closed || !ranges.length) return { weekday, closed: true, ranges: [] };
    return { weekday, closed: false, ranges };
  });
}

function parseTimeToken(token: string): number | null {
  const match = token.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function expandDayToken(token: string): number[] {
  const key = token.trim().toLowerCase().replace(/\./g, '');
  if (key in DAY_NAMES) return [DAY_NAMES[key]];
  return [];
}

function expandDayRange(days: string): number[] {
  const normalized = days.trim().toLowerCase().replace(/\s+/g, ' ');
  const rangeMatch = normalized.match(/^(.+?)\s*[–-]\s*(.+)$/);
  if (rangeMatch) {
    const start = DAY_NAMES[rangeMatch[1].trim()];
    const end = DAY_NAMES[rangeMatch[2].trim()];
    if (start == null || end == null) return [];
    const out: number[] = [];
    if (start <= end) {
      for (let d = start; d <= end; d++) out.push(d);
    } else {
      for (let d = start; d <= 6; d++) out.push(d);
      for (let d = 0; d <= end; d++) out.push(d);
    }
    return out;
  }
  return expandDayToken(normalized);
}

/** Legacy: Freitext-Zeilen → Minuten pro Wochentag (ein Fenster). */
export function parseLegacyHourRows(rows: FwHourRow[]): Map<number, { open: number; close: number } | null> {
  const map = new Map<number, { open: number; close: number } | null>();
  for (let d = 0; d <= 6; d++) map.set(d, null);

  for (const row of rows) {
    const time = row.time.trim().toLowerCase();
    const weekdays = expandDayRange(row.days);
    if (!weekdays.length) continue;

    if (!time || time.includes('geschlossen') || time.includes('ruhetag')) {
      for (const d of weekdays) map.set(d, null);
      continue;
    }

    const parts = row.time.split(/[–-]/);
    if (parts.length < 2) continue;
    const open = parseTimeToken(parts[0]);
    const close = parseTimeToken(parts[1]);
    if (open == null || close == null || close <= open) continue;

    for (const d of weekdays) map.set(d, { open, close });
  }

  return map;
}

export function migrateHoursRows(rows: FwHourRow[]): FwOpeningHoursSchedule {
  const map = parseLegacyHourRows(rows);
  return FW_WEEKDAY_ORDER.map((weekday) => {
    const hours = map.get(weekday);
    if (!hours) return { weekday, closed: true, ranges: [] };
    return {
      weekday,
      closed: false,
      ranges: [{ from: minutesToTime(hours.open), to: minutesToTime(hours.close) }],
    };
  });
}

export function formatDayRangesText(ranges: FwTimeRange[]): string {
  if (!ranges.length) return 'geschlossen';
  return ranges.map((r) => `${r.from} – ${r.to} Uhr`).join(', ');
}

function daySignature(day: FwDaySchedule): string {
  if (day.closed || !day.ranges.length) return 'closed';
  return day.ranges.map((r) => `${r.from}-${r.to}`).join('|');
}

export function formatOpeningHoursRows(schedule: FwOpeningHoursSchedule): FwHourRow[] {
  const normalized = normalizeOpeningHours(schedule);
  const byWeekday = new Map(normalized.map((d) => [d.weekday, d]));
  const rows: FwHourRow[] = [];
  let i = 0;

  while (i < FW_WEEKDAY_ORDER.length) {
    const startWd = FW_WEEKDAY_ORDER[i];
    const sig = daySignature(byWeekday.get(startWd)!);
    let j = i + 1;
    while (j < FW_WEEKDAY_ORDER.length && daySignature(byWeekday.get(FW_WEEKDAY_ORDER[j])!) === sig) {
      j++;
    }
    const startLabel = FW_WEEKDAY_LABELS[FW_WEEKDAY_ORDER[i]];
    const endLabel = FW_WEEKDAY_LABELS[FW_WEEKDAY_ORDER[j - 1]];
    const days = i === j - 1 ? startLabel : `${startLabel} – ${endLabel}`;
    const day = byWeekday.get(startWd)!;
    const closed = day.closed || !day.ranges.length;
    rows.push({
      days,
      time: formatDayRangesText(day.ranges),
      ranges: closed ? [] : day.ranges.map((r) => ({ ...r })),
      closed,
    });
    i = j;
  }

  return rows;
}

export function formatOpeningHoursButtonLabel(schedule: FwOpeningHoursSchedule): string {
  const rows = formatOpeningHoursRows(schedule);
  const text = rows.map((r) => `${r.days}: ${r.time}`).join(' · ');
  if (text.length <= 72) return text;
  return `${text.slice(0, 69)}…`;
}

export type FwDayRangeMinutes = { open: number; close: number };

export function getDayRangesMinutes(
  schedule: FwOpeningHoursSchedule,
  weekday: number,
): FwDayRangeMinutes[] {
  const day = normalizeOpeningHours(schedule).find((d) => d.weekday === weekday);
  if (!day || day.closed) return [];
  return day.ranges
    .map((r) => ({ open: timeToMinutes(r.from), close: timeToMinutes(r.to) }))
    .filter((r) => r.close > r.open);
}

export function fitsInDayRanges(start: number, duration: number, ranges: FwDayRangeMinutes[]): boolean {
  const end = start + duration;
  return ranges.some((r) => start >= r.open && end <= r.close);
}

/** Startzeit im Fenster — Behandlung darf über Schließung hinausgehen (z. B. 17:30 bei 18:00). */
export function fitsSlotStartInRanges(start: number, ranges: FwDayRangeMinutes[]): boolean {
  return ranges.some((r) => start >= r.open && start < r.close);
}

/** Letzte N Zeitraster vor Schließung eines Tagesfensters — keine Neubuchungen. */
export function isInClosingBuffer(
  start: number,
  ranges: FwDayRangeMinutes[],
  slotStepMinutes: number,
  closingBufferSlots: number,
): boolean {
  if (closingBufferSlots <= 0) return false;
  const step = Math.max(1, slotStepMinutes);
  for (const range of ranges) {
    if (start >= range.open && start < range.close) {
      const cutoff = range.close - closingBufferSlots * step;
      return start >= cutoff;
    }
  }
  return false;
}

type LiveTone = 'open' | 'soon' | 'closed';

export function getLiveOpenStatus(
  schedule: FwOpeningHoursSchedule,
  now = new Date(),
): { badge: string; detail: string; tone: LiveTone } {
  const day = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  const ranges = getDayRangesMinutes(schedule, day);

  if (!ranges.length) {
    const next = findNextOpening(schedule, now);
    return {
      badge: 'Heute geschlossen',
      detail: next ? `${next.label} ab ${next.time} Uhr wieder für Sie da.` : 'Aktuell geschlossen.',
      tone: 'closed',
    };
  }

  for (const range of ranges) {
    if (mins >= range.open && mins < range.close) {
      const left = range.close - mins;
      const h = Math.floor(left / 60);
      const m = left % 60;
      const leftLabel = h > 0 ? `${h} Std.` : `${m} Min.`;
      const todayText = formatDayRangesText(
        normalizeOpeningHours(schedule).find((d) => d.weekday === day)?.ranges ?? [],
      );
      return {
        badge: 'Jetzt geöffnet',
        detail: `Noch ca. ${leftLabel} für Sie da · ${todayText}`,
        tone: 'open',
      };
    }
  }

  const nextToday = ranges.find((r) => mins < r.open);
  if (nextToday) {
    const gapMins = nextToday.open - mins;
    if (gapMins <= 45) {
      return {
        badge: 'Gleich geöffnet',
        detail: `Wir öffnen in Kürze — ab ${minutesToTime(nextToday.open)} Uhr.`,
        tone: 'soon',
      };
    }
    return {
      badge: 'Mittagspause',
      detail: `Wieder ab ${minutesToTime(nextToday.open)} Uhr für Sie da.`,
      tone: 'closed',
    };
  }

  const first = ranges[0];
  if (mins < first.open) {
    const soon = first.open - 45;
    if (mins < soon) {
      const close = ranges[ranges.length - 1].close;
      return {
        badge: 'Noch geschlossen',
        detail: `Heute geöffnet ab ${minutesToTime(first.open)} Uhr · bis ${minutesToTime(close)} Uhr`,
        tone: 'closed',
      };
    }
    return {
      badge: 'Gleich geöffnet',
      detail: `Wir öffnen in Kürze — ab ${minutesToTime(first.open)} Uhr.`,
      tone: 'soon',
    };
  }

  const next = findNextOpening(schedule, now);
  return {
    badge: 'Heute geschlossen',
    detail: next ? `${next.label} ab ${next.time} Uhr wieder geöffnet.` : 'Heute keine weiteren Termine.',
    tone: 'closed',
  };
}

function findNextOpening(
  schedule: FwOpeningHoursSchedule,
  now: Date,
): { label: string; time: string } | null {
  const startMins = now.getHours() * 60 + now.getMinutes();
  const today = now.getDay();

  const todayRanges = getDayRangesMinutes(schedule, today);
  const laterToday = todayRanges.find((r) => r.open > startMins);
  if (laterToday) {
    return { label: 'Heute', time: minutesToTime(laterToday.open) };
  }

  for (let offset = 1; offset <= 7; offset++) {
    const wd = (today + offset) % 7;
    const ranges = getDayRangesMinutes(schedule, wd);
    if (ranges.length) {
      const label = offset === 1 ? 'Morgen' : FW_WEEKDAY_LABELS[wd];
      return { label, time: minutesToTime(ranges[0].open) };
    }
  }

  return null;
}
