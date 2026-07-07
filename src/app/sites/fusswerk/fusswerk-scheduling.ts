import type { FwService } from './fusswerk.data';
import type { FwBookingSettings, FwHourRow, FwOpeningHoursSchedule } from './fusswerk-content.types';
import type { FwBookingRecord, FwBookingSlot } from './fusswerk-booking.types';
import { parseDurationMinutes } from './fusswerk-duration.util';
import {
  fitsSlotStartInRanges,
  getDayRangesMinutes,
  isInClosingBuffer,
  minutesToTime,
  timeToMinutes,
} from './fusswerk-opening-hours.util';

export type { FwHourRow, FwOpeningHoursSchedule } from './fusswerk-content.types';

export type FwSlotAudience = 'customer' | 'staff';

export type FwSchedulePayload = {
  openingHours: FwOpeningHoursSchedule;
  /** Abgeleitete Anzeige-Zeilen — für ältere Clients */
  hours: FwHourRow[];
  services: Pick<FwService, 'id' | 'duration' | 'durationMinutes'>[];
  settings: FwBookingSettings;
};

export function parseDurationMinutesFromSchedule(
  raw: string | undefined,
  durationMinutes: number | undefined,
  fallback = 45,
): number {
  if (typeof durationMinutes === 'number' && durationMinutes > 0) return durationMinutes;
  return parseDurationMinutes(raw ?? '', fallback);
}

export { parseDurationMinutes } from './fusswerk-duration.util';

export { timeToMinutes, minutesToTime } from './fusswerk-opening-hours.util';

export function clampGapBeforeBookingMinutes(value: number): number {
  if (!Number.isFinite(value)) return 45;
  return Math.min(120, Math.max(5, Math.round(value)));
}

export type FwCustomerParallelPolicy = FwBookingSettings['customerParallelPolicy'];

export function normalizeCustomerParallelPolicy(
  value: FwCustomerParallelPolicy | string | undefined,
): FwCustomerParallelPolicy {
  if (value === 'pending_only' || value === 'always') return value;
  return 'blocked';
}

/** Blockiert ein bestehender Termin neue Kundenanfragen (nicht für Studio). */
export function existingBookingBlocksCustomer(
  booking: Pick<FwBookingRecord, 'status' | 'serviceId'>,
  policy: FwCustomerParallelPolicy | string | undefined,
  audience: FwSlotAudience,
): boolean {
  if (audience !== 'customer') return true;
  if (booking.serviceId === 'block') return true;
  const mode = normalizeCustomerParallelPolicy(policy);
  if (mode === 'blocked') return true;
  if (mode === 'pending_only') return booking.status === 'confirmed';
  return false;
}

export function getServiceDurationMinutes(
  serviceId: string | undefined,
  schedule: FwSchedulePayload,
): number {
  const { settings, services } = schedule;
  if (!settings.useServiceDurations) {
    return settings.defaultDurationMinutes;
  }
  const svc = services.find((s) => s.id === serviceId);
  return parseDurationMinutesFromSchedule(svc?.duration, svc?.durationMinutes, settings.defaultDurationMinutes);
}

export function getBookingDurationMinutes(
  booking: Pick<FwBookingRecord, 'serviceId' | 'durationMinutes'>,
  schedule: FwSchedulePayload,
): number {
  if (booking.serviceId === 'block' && typeof booking.durationMinutes === 'number' && booking.durationMinutes > 0) {
    return booking.durationMinutes;
  }
  if (typeof booking.durationMinutes === 'number' && booking.durationMinutes > 0) {
    return booking.durationMinutes;
  }
  return getServiceDurationMinutes(booking.serviceId, schedule);
}

export function slotDurationForGrid(schedule: FwSchedulePayload): number {
  if (!schedule.settings.useServiceDurations) {
    return schedule.settings.defaultDurationMinutes;
  }
  const durations = schedule.services.map((s) =>
    parseDurationMinutesFromSchedule(s.duration, s.durationMinutes, schedule.settings.defaultDurationMinutes),
  );
  return durations.length ? Math.min(...durations) : schedule.settings.defaultDurationMinutes;
}

export function slotStartsForDate(dateStr: string, schedule: FwSchedulePayload, serviceId?: string): string[] {
  const day = new Date(`${dateStr}T12:00:00`).getDay();
  const ranges = getDayRangesMinutes(schedule.openingHours, day);
  if (!ranges.length) return [];

  const step = schedule.settings.slotStepMinutes;
  const slots: string[] = [];

  for (const range of ranges) {
    for (let start = range.open; start < range.close; start += step) {
      slots.push(minutesToTime(start));
    }
  }

  return [...new Set(slots)].sort();
}

type ActiveBooking = Pick<FwBookingRecord, 'id' | 'slot' | 'serviceId' | 'status' | 'name' | 'date' | 'durationMinutes'>;

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function bookingIntervals(
  slot: string,
  serviceId: string,
  schedule: FwSchedulePayload,
  durationMinutes?: number,
): { start: number; treatmentEnd: number; blockedUntil: number } {
  const start = timeToMinutes(slot);
  const duration =
    typeof durationMinutes === 'number' && durationMinutes > 0
      ? durationMinutes
      : getServiceDurationMinutes(serviceId, schedule);
  const buffer = schedule.settings.bufferMinutes;
  return {
    start,
    treatmentEnd: start + duration,
    blockedUntil: start + duration + buffer,
  };
}

function bookingIntervalsFromBooking(
  booking: ActiveBooking,
  schedule: FwSchedulePayload,
): { start: number; treatmentEnd: number; blockedUntil: number } {
  return bookingIntervals(
    booking.slot,
    booking.serviceId,
    schedule,
    getBookingDurationMinutes(booking, schedule),
  );
}

function bookingAtSlotStart(
  time: string,
  bookings: ActiveBooking[],
  schedule: FwSchedulePayload,
): ActiveBooking | undefined {
  const start = timeToMinutes(time);
  return bookings.find((booking) => {
    const bStart = timeToMinutes(booking.slot);
    const duration = getBookingDurationMinutes(booking, schedule);
    return start >= bStart && start < bStart + duration;
  });
}

/** Behandlungen dürfen sich nicht überschneiden; Puffer nur zwischen Terminen. */
function appointmentsClash(
  candidate: ReturnType<typeof bookingIntervals>,
  existing: ReturnType<typeof bookingIntervals>,
  gapBeforeMinutes: number,
  audience: FwSlotAudience,
): boolean {
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

export function isSlotAvailable(
  date: string,
  time: string,
  serviceId: string | undefined,
  schedule: FwSchedulePayload,
  bookings: ActiveBooking[],
  now = new Date(),
  audience: FwSlotAudience = 'customer',
): boolean {
  const day = new Date(`${date}T12:00:00`).getDay();
  const ranges = getDayRangesMinutes(schedule.openingHours, day);
  if (!ranges.length) return false;

  const duration = getServiceDurationMinutes(serviceId, schedule);
  const start = timeToMinutes(time);
  if (!fitsSlotStartInRanges(start, ranges)) return false;

  if (
    audience === 'customer' &&
    isInClosingBuffer(
      start,
      ranges,
      schedule.settings.slotStepMinutes,
      schedule.settings.closingBufferSlots ?? 0,
    )
  ) {
    return false;
  }

  const today = now.toISOString().slice(0, 10);
  if (date === today && audience === 'customer') {
    const nowMins = now.getHours() * 60 + now.getMinutes();
    if (start <= nowMins) return false;
  }

  const candidate = {
    start,
    treatmentEnd: start + duration,
    blockedUntil: start + duration + schedule.settings.bufferMinutes,
  };

  const gapBefore = clampGapBeforeBookingMinutes(schedule.settings.gapBeforeBookingMinutes ?? 45);
  const parallelPolicy = schedule.settings.customerParallelPolicy;

  for (const booking of bookings) {
    if (booking.date !== date) continue;
    if (booking.status !== 'pending' && booking.status !== 'confirmed') continue;
    if (!existingBookingBlocksCustomer(booking, parallelPolicy, audience)) continue;
    const existing = bookingIntervalsFromBooking(booking, schedule);
    if (appointmentsClash(candidate, existing, gapBefore, audience)) {
      return false;
    }
  }

  return true;
}

export function computeSlots(
  date: string,
  schedule: FwSchedulePayload,
  bookings: FwBookingRecord[],
  serviceId?: string,
  now = new Date(),
): FwBookingSlot[] {
  const starts = slotStartsForDate(date, schedule, serviceId);
  const active = bookings.filter(
    (b) => b.date === date && (b.status === 'pending' || b.status === 'confirmed'),
  );

  return starts.map((time) => {
    const covering = bookingAtSlotStart(time, active, schedule);
    const customerOk = isSlotAvailable(date, time, serviceId, schedule, active, now, 'customer');
    const staffOk = isSlotAvailable(date, time, serviceId, schedule, active, now, 'staff');
    const showBooking = covering && timeToMinutes(time) === timeToMinutes(covering.slot) ? covering : null;
    const slotBlocksCustomer =
      covering &&
      existingBookingBlocksCustomer(covering, schedule.settings.customerParallelPolicy, 'customer');
    return {
      time,
      available: customerOk && !slotBlocksCustomer,
      staffBookable: staffOk && !covering,
      booking: showBooking
        ? {
            id: showBooking.id,
            status: showBooking.status,
            name: showBooking.name,
            serviceId: showBooking.serviceId,
          }
        : null,
    };
  });
}

export function bookingClash(
  bookings: FwBookingRecord[],
  date: string,
  slot: string,
  serviceId: string,
  schedule: FwSchedulePayload,
  excludeId?: string,
  audience: FwSlotAudience = 'customer',
): boolean {
  const active = bookings.filter(
    (b) =>
      b.id !== excludeId &&
      b.date === date &&
      (b.status === 'pending' || b.status === 'confirmed'),
  );
  return !isSlotAvailable(date, slot, serviceId, schedule, active, new Date(), audience);
}
