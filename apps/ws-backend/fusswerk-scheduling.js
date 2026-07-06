'use strict';

const DAY_NAMES = {
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

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const DEFAULT_OPENING_HOURS = [
  { weekday: 1, closed: false, ranges: [{ from: '09:00', to: '18:00' }] },
  { weekday: 2, closed: false, ranges: [{ from: '09:00', to: '18:00' }] },
  { weekday: 3, closed: false, ranges: [{ from: '09:00', to: '18:00' }] },
  { weekday: 4, closed: false, ranges: [{ from: '09:00', to: '18:00' }] },
  { weekday: 5, closed: false, ranges: [{ from: '09:00', to: '18:00' }] },
  { weekday: 6, closed: false, ranges: [{ from: '09:00', to: '14:00' }] },
  { weekday: 0, closed: true, ranges: [] },
];

const DEFAULT_SETTINGS = {
  defaultDurationMinutes: 45,
  useServiceDurations: true,
  bufferMinutes: 10,
  slotStepMinutes: 15,
  closingBufferSlots: 0,
  gapBeforeBookingMinutes: 45,
};

function clampGapBeforeBookingMinutes(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 45;
  return Math.min(120, Math.max(5, Math.round(n)));
}

function parseDurationMinutes(raw, fallback = 45) {
  const match = String(raw ?? '').match(/(\d+)/);
  if (!match) return fallback;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseTimeToken(token) {
  const match = String(token).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function expandDayToken(token) {
  const key = String(token).trim().toLowerCase().replace(/\./g, '');
  if (key in DAY_NAMES) return [DAY_NAMES[key]];
  return [];
}

function expandDayRange(days) {
  const normalized = String(days).trim().toLowerCase().replace(/\s+/g, ' ');
  const rangeMatch = normalized.match(/^(.+?)\s*[–-]\s*(.+)$/);
  if (rangeMatch) {
    const start = DAY_NAMES[rangeMatch[1].trim()];
    const end = DAY_NAMES[rangeMatch[2].trim()];
    if (start == null || end == null) return [];
    const out = [];
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

function parseLegacyHourRows(rows) {
  const map = new Map();
  for (let d = 0; d <= 6; d++) map.set(d, null);
  for (const row of rows || []) {
    const time = String(row.time || '').trim().toLowerCase();
    const weekdays = expandDayRange(row.days || '');
    if (!weekdays.length) continue;
    if (!time || time.includes('geschlossen') || time.includes('ruhetag')) {
      for (const d of weekdays) map.set(d, null);
      continue;
    }
    const parts = String(row.time).split(/[–-]/);
    if (parts.length < 2) continue;
    const open = parseTimeToken(parts[0]);
    const close = parseTimeToken(parts[1]);
    if (open == null || close == null || close <= open) continue;
    for (const d of weekdays) map.set(d, { open, close });
  }
  return map;
}

function migrateHoursRows(rows) {
  const map = parseLegacyHourRows(rows);
  return WEEKDAY_ORDER.map((weekday) => {
    const hours = map.get(weekday);
    if (!hours) return { weekday, closed: true, ranges: [] };
    return {
      weekday,
      closed: false,
      ranges: [{ from: minutesToTime(hours.open), to: minutesToTime(hours.close) }],
    };
  });
}

function normalizeOpeningHours(raw) {
  const byWeekday = new Map((raw || []).map((d) => [d.weekday, d]));
  return WEEKDAY_ORDER.map((weekday) => {
    const day = byWeekday.get(weekday);
    if (!day) return { weekday, closed: true, ranges: [] };
    const ranges = (day.ranges || [])
      .map((r) => ({ from: r.from, to: r.to }))
      .filter((r) => timeToMinutes(r.to) > timeToMinutes(r.from))
      .sort((a, b) => timeToMinutes(a.from) - timeToMinutes(b.from));
    if (day.closed || !ranges.length) return { weekday, closed: true, ranges: [] };
    return { weekday, closed: false, ranges };
  });
}

function resolveOpeningHours(schedule) {
  if (Array.isArray(schedule?.openingHours) && schedule.openingHours.length) {
    return normalizeOpeningHours(schedule.openingHours);
  }
  if (Array.isArray(schedule?.hours) && schedule.hours.length) {
    return migrateHoursRows(schedule.hours);
  }
  return DEFAULT_OPENING_HOURS;
}

function getDayRangesMinutes(schedule, weekday) {
  const day = resolveOpeningHours(schedule).find((d) => d.weekday === weekday);
  if (!day || day.closed) return [];
  return day.ranges
    .map((r) => ({ open: timeToMinutes(r.from), close: timeToMinutes(r.to) }))
    .filter((r) => r.close > r.open);
}

function fitsInDayRanges(start, duration, ranges) {
  const end = start + duration;
  return ranges.some((r) => start >= r.open && end <= r.close);
}

function fitsSlotStartInRanges(start, ranges) {
  return ranges.some((r) => start >= r.open && start < r.close);
}

function isInClosingBuffer(start, ranges, slotStepMinutes, closingBufferSlots) {
  if (!closingBufferSlots || closingBufferSlots <= 0) return false;
  const step = Math.max(1, slotStepMinutes);
  for (const range of ranges) {
    if (start >= range.open && start < range.close) {
      const cutoff = range.close - closingBufferSlots * step;
      return start >= cutoff;
    }
  }
  return false;
}

/** @deprecated Legacy-Freitext */
function parseOpeningHours(rows) {
  const map = new Map();
  for (let d = 0; d <= 6; d++) map.set(d, null);
  const legacy = parseLegacyHourRows(rows);
  for (const [d, hours] of legacy.entries()) {
    if (hours) map.set(d, hours);
  }
  return map;
}

function normalizeSchedule(schedule) {
  const settings = { ...DEFAULT_SETTINGS, ...(schedule?.settings || {}) };
  const services = Array.isArray(schedule?.services) ? schedule.services : [];
  const openingHours = resolveOpeningHours(schedule);
  const hours = Array.isArray(schedule?.hours) ? schedule.hours : [];
  return { openingHours, hours, services, settings };
}

function getServiceDurationMinutes(serviceId, schedule) {
  const { settings, services } = normalizeSchedule(schedule);
  if (!settings.useServiceDurations) return settings.defaultDurationMinutes;
  const svc = services.find((s) => s.id === serviceId);
  if (typeof svc?.durationMinutes === 'number' && svc.durationMinutes > 0) return svc.durationMinutes;
  return parseDurationMinutes(svc?.duration, settings.defaultDurationMinutes);
}

function slotDurationForGrid(schedule) {
  const { settings, services } = normalizeSchedule(schedule);
  if (!settings.useServiceDurations) return settings.defaultDurationMinutes;
  const durations = services.map((s) =>
    typeof s.durationMinutes === 'number' && s.durationMinutes > 0
      ? s.durationMinutes
      : parseDurationMinutes(s.duration, settings.defaultDurationMinutes),
  );
  return durations.length ? Math.min(...durations) : settings.defaultDurationMinutes;
}

function slotStartsForDate(dateStr, schedule, serviceId) {
  const day = new Date(`${dateStr}T12:00:00`).getDay();
  const ranges = getDayRangesMinutes(schedule, day);
  if (!ranges.length) return [];
  const step = normalizeSchedule(schedule).settings.slotStepMinutes;
  const slots = [];
  for (const range of ranges) {
    for (let start = range.open; start < range.close; start += step) {
      slots.push(minutesToTime(start));
    }
  }
  return [...new Set(slots)].sort();
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function bookingIntervals(slot, serviceId, schedule) {
  const start = timeToMinutes(slot);
  const duration = getServiceDurationMinutes(serviceId, schedule);
  const buffer = normalizeSchedule(schedule).settings.bufferMinutes;
  return {
    start,
    treatmentEnd: start + duration,
    blockedUntil: start + duration + buffer,
  };
}

function appointmentsClash(candidate, existing, gapBeforeMinutes, audience) {
  if (rangesOverlap(candidate.start, candidate.treatmentEnd, existing.start, existing.treatmentEnd)) {
    return true;
  }
  if (candidate.start < existing.start) {
    if (candidate.treatmentEnd > existing.start) return true;
    if (audience === 'customer' && existing.start - candidate.start < gapBeforeMinutes) {
      return true;
    }
    return false;
  }
  if (candidate.start > existing.start) {
    return candidate.start < existing.blockedUntil;
  }
  return true;
}

function isSlotAvailable(date, time, serviceId, schedule, bookings, now = new Date(), audience = 'customer') {
  const day = new Date(`${date}T12:00:00`).getDay();
  const ranges = getDayRangesMinutes(schedule, day);
  if (!ranges.length) return false;
  const duration = getServiceDurationMinutes(serviceId, schedule);
  const start = timeToMinutes(time);
  if (!fitsSlotStartInRanges(start, ranges)) return false;
  const { settings } = normalizeSchedule(schedule);
  if (
    audience === 'customer' &&
    isInClosingBuffer(start, ranges, settings.slotStepMinutes, settings.closingBufferSlots ?? 0)
  ) {
    return false;
  }
  const today = now.toISOString().slice(0, 10);
  if (date === today) {
    const nowMins = now.getHours() * 60 + now.getMinutes();
    if (start <= nowMins) return false;
  }
  const candidate = {
    start,
    treatmentEnd: start + duration,
    blockedUntil: start + duration + settings.bufferMinutes,
  };
  const gapBefore = clampGapBeforeBookingMinutes(settings.gapBeforeBookingMinutes ?? 45);
  for (const booking of bookings) {
    if (booking.status !== 'pending' && booking.status !== 'confirmed') continue;
    const existing = bookingIntervals(booking.slot, booking.serviceId, schedule);
    if (appointmentsClash(candidate, existing, gapBefore, audience)) return false;
  }
  return true;
}

function computeSlots(date, schedule, bookings, serviceId, now = new Date()) {
  const starts = slotStartsForDate(date, schedule, serviceId);
  const active = (bookings || []).filter(
    (b) => b.date === date && (b.status === 'pending' || b.status === 'confirmed'),
  );
  const bookingAt = new Map(active.map((b) => [b.slot, b]));
  return starts.map((time) => {
    const direct = bookingAt.get(time);
    const customerOk = isSlotAvailable(date, time, serviceId, schedule, active, now, 'customer');
    const staffOk = isSlotAvailable(date, time, serviceId, schedule, active, now, 'staff');
    return {
      time,
      available: customerOk && !direct,
      staffBookable: staffOk && !direct,
      booking: direct
        ? {
            id: direct.id,
            status: direct.status,
            name: direct.name,
            serviceId: direct.serviceId,
          }
        : null,
    };
  });
}

function bookingClash(bookings, date, slot, serviceId, schedule, excludeId, audience = 'customer') {
  const active = (bookings || []).filter(
    (b) =>
      b.id !== excludeId &&
      b.date === date &&
      (b.status === 'pending' || b.status === 'confirmed'),
  );
  return !isSlotAvailable(date, slot, serviceId, schedule, active, new Date(), audience);
}

function isValidSlot(date, slot, serviceId, schedule) {
  const starts = slotStartsForDate(date, schedule, serviceId);
  return starts.includes(slot);
}

module.exports = {
  DEFAULT_SETTINGS,
  DEFAULT_OPENING_HOURS,
  parseDurationMinutes,
  parseOpeningHours,
  resolveOpeningHours,
  slotStartsForDate,
  computeSlots,
  bookingClash,
  isSlotAvailable,
  isValidSlot,
  getServiceDurationMinutes,
};
