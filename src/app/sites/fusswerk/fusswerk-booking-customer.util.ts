import type { FwBookingRecord } from './fusswerk-booking.types';

function normEmail(value?: string): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function normPhone(value?: string): string {
  return String(value ?? '').replace(/\D/g, '');
}

function normName(value?: string): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Gleicher Kunde über Client-Key, IP, E-Mail, Telefon oder Name. */
export function isSameBookingCustomer(a: FwBookingRecord, b: FwBookingRecord): boolean {
  if (a.id === b.id) return true;
  if (a.clientKey && b.clientKey && a.clientKey === b.clientKey) return true;
  if (a.clientIp && b.clientIp && a.clientIp !== 'unknown' && a.clientIp === b.clientIp) return true;

  const emailA = normEmail(a.email);
  const emailB = normEmail(b.email);
  if (emailA && emailB && emailA === emailB) return true;

  const phoneA = normPhone(a.phone);
  const phoneB = normPhone(b.phone);
  if (phoneA.length >= 6 && phoneA === phoneB) return true;

  const nameA = normName(a.name);
  const nameB = normName(b.name);
  if (nameA.length >= 2 && nameA === nameB) return true;

  return false;
}

export function sameCustomerBookingsOnDay(
  booking: FwBookingRecord,
  dayBookings: FwBookingRecord[],
): FwBookingRecord[] {
  return dayBookings
    .filter((b) => b.status !== 'cancelled')
    .filter((b) => isSameBookingCustomer(b, booking))
    .sort((a, b) => a.slot.localeCompare(b.slot));
}

export function hasSameCustomerDuplicateOnDay(
  booking: FwBookingRecord,
  dayBookings: FwBookingRecord[],
): boolean {
  return sameCustomerBookingsOnDay(booking, dayBookings).length > 1;
}
