export const FW_BOOKINGS_SYNC = 'fw-bookings-sync';

export function notifyFwBookingsChanged(): void {
  if (typeof BroadcastChannel === 'undefined') return;
  new BroadcastChannel(FW_BOOKINGS_SYNC).postMessage({ type: 'updated', at: Date.now() });
}
