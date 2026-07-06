import { Injectable, inject, computed, signal } from '@angular/core';
import { sanitizeEmail, sanitizePhone, sanitizeText } from './fusswerk-security';
import { FusswerkContentService } from './fusswerk-content.service';
import { computeSlots } from './fusswerk-scheduling';
import type { FwBookingRecord, FwBookingSlot } from './fusswerk-booking.types';
import type { FwSchedulePayload } from './fusswerk-scheduling';
import { FW_BOOKINGS_SYNC, notifyFwBookingsChanged } from './fusswerk-booking-sync';

export type { FwBookingRecord } from './fusswerk-booking.types';

@Injectable({ providedIn: 'root' })
export class FusswerkBookingAdminService {
  private readonly content = inject(FusswerkContentService);
  private readonly syncChannel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(FW_BOOKINGS_SYNC) : null;
  private readonly bookings = signal<FwBookingRecord[]>([]);
  private readonly loading = signal(false);
  private readonly error = signal('');
  private refreshInFlight: Promise<void> | null = null;

  readonly all = this.bookings.asReadonly();
  readonly isLoading = this.loading.asReadonly();
  readonly loadError = this.error.asReadonly();
  /** Steigt bei jeder erfolgreichen Aktualisierung — für Live-Reaktion im Kalender. */
  readonly revision = signal(0);

  readonly pendingCount = computed(
    () => this.bookings().filter((b) => b.status === 'pending').length,
  );

  readonly sorted = computed(() =>
    [...this.bookings()].sort((a, b) => {
      const da = `${a.date}T${a.slot}`;
      const db = `${b.date}T${b.slot}`;
      return da.localeCompare(db);
    }),
  );

  readonly byDate = computed(() => {
    const map = new Map<string, FwBookingRecord[]>();
    for (const b of this.bookings()) {
      if (b.status === 'cancelled') continue;
      const list = map.get(b.date) ?? [];
      list.push(b);
      map.set(b.date, list);
    }
    return map;
  });

  constructor() {
    this.syncChannel?.addEventListener('message', () => {
      void this.refresh({ fromSync: true });
    });
  }

  async refresh(options?: { fromSync?: boolean }): Promise<void> {
    if (this.refreshInFlight) {
      await this.refreshInFlight;
      return;
    }
    this.refreshInFlight = this.loadBookings(options?.fromSync ?? false).finally(() => {
      this.refreshInFlight = null;
    });
    await this.refreshInFlight;
  }

  private async loadBookings(fromSync: boolean): Promise<void> {
    if (!fromSync) {
      this.loading.set(true);
    }
    if (!fromSync) {
      this.error.set('');
    }
    try {
      const res = await fetch('/api/fusswerk/bookings');
      const data = (await res.json()) as { ok?: boolean; bookings?: FwBookingRecord[]; error?: string };
      if (!res.ok || !data.ok) {
        const msg = data.error ?? 'Buchungen konnten nicht geladen werden.';
        if (!fromSync) {
          this.error.set(
            msg === 'Nicht gefunden'
              ? 'Termin-API nicht erreichbar — bitte „npm run start:api“ neu starten.'
              : msg,
          );
        }
        return;
      }
      const next = data.bookings ?? [];
      if (this.sameBookings(this.bookings(), next)) {
        return;
      }
      this.bookings.set(next);
      this.revision.update((n) => n + 1);
      if (!fromSync) notifyFwBookingsChanged();
    } catch {
      if (!fromSync) {
        this.error.set('Backend nicht erreichbar — bitte API starten.');
      }
    } finally {
      if (!fromSync) {
        this.loading.set(false);
      }
    }
  }

  private sameBookings(a: FwBookingRecord[], b: FwBookingRecord[]): boolean {
    if (a.length !== b.length) return false;
    const fingerprint = (list: FwBookingRecord[]) =>
      list
        .map(
          (item) =>
            `${item.id}|${item.status}|${item.date}|${item.slot}|${item.createdAt}|${item.confirmedAt ?? ''}`,
        )
        .sort()
        .join('\n');
    return fingerprint(a) === fingerprint(b);
  }

  async loadSlots(date: string, serviceId?: string): Promise<FwBookingSlot[]> {
    const schedule = this.content.schedulePayload();
    try {
      const res = await fetch('/api/fusswerk/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, serviceId, schedule }),
      });
      const data = (await res.json()) as { ok?: boolean; slots?: FwBookingSlot[] };
      if (!res.ok || !data.ok) {
        return computeSlots(date, schedule, this.bookings(), serviceId);
      }
      return data.slots ?? [];
    } catch {
      return computeSlots(date, schedule, this.bookings(), serviceId);
    }
  }

  async confirm(id: string): Promise<string | null> {
    return this.patch(id, { action: 'confirm' });
  }

  async cancel(id: string, note?: string): Promise<string | null> {
    return this.patch(id, { action: 'cancel', note });
  }

  async reschedule(
    id: string,
    date: string,
    slot: string,
    notifyMode: 'direct' | 'request',
  ): Promise<string | null> {
    return this.patch(id, {
      action: 'reschedule',
      date,
      slot,
      notifyMode,
      schedule: this.content.schedulePayload(),
      audience: 'staff',
    });
  }

  async createManual(input: {
    name: string;
    phone?: string;
    email?: string;
    date: string;
    slot: string;
    serviceId: string;
    status?: 'pending' | 'confirmed';
  }): Promise<{ bookingId: string } | { error: string }> {
    const schedule = this.content.schedulePayload();
    try {
      const res = await fetch('/api/fusswerk/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sanitizeText(input.name, 80),
          phone: sanitizePhone(input.phone ?? ''),
          email: sanitizeEmail(input.email ?? ''),
          date: input.date,
          slot: input.slot,
          serviceId: input.serviceId,
          status: input.status ?? 'confirmed',
          source: 'manual',
          schedule,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        booking?: { id: string };
      };
      if (!res.ok || !data.ok) {
        return { error: data.error ?? 'Termin konnte nicht angelegt werden.' };
      }
      const bookingId = data.booking?.id;
      if (!bookingId) {
        return { error: 'Termin konnte nicht angelegt werden.' };
      }
      await this.refresh();
      return { bookingId };
    } catch {
      return { error: 'Backend nicht erreichbar.' };
    }
  }

  async cancelMany(ids: string[]): Promise<string | null> {
    for (const id of ids) {
      const err = await this.cancel(id);
      if (err) return err;
    }
    return null;
  }

  serviceLabel(serviceId: string, labels: Record<string, string>): string {
    return labels[serviceId] ?? serviceId;
  }

  private async patch(id: string, body: Record<string, unknown>): Promise<string | null> {
    try {
      const res = await fetch(`/api/fusswerk/bookings/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) return data.error ?? 'Aktion fehlgeschlagen.';
      await this.refresh();
      return null;
    } catch {
      return 'Backend nicht erreichbar.';
    }
  }
}
