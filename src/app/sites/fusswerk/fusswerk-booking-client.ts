const FW_BOOKING_CLIENT_KEY = 'fw-demo-booking-client-v1';

/** Stabiler Browser-Schlüssel zur Zuordnung mehrerer Termine desselben Kunden. */
export function getFwBookingClientKey(): string {
  if (typeof localStorage === 'undefined') return '';
  let id = localStorage.getItem(FW_BOOKING_CLIENT_KEY);
  if (!id) {
    id = `fwc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(FW_BOOKING_CLIENT_KEY, id);
  }
  return id;
}
