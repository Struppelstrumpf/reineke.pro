import { Injectable, inject, signal } from '@angular/core';
import { FusswerkContentService } from './fusswerk-content.service';
import { computeSlots } from './fusswerk-scheduling';
import type { FwBookingResult, FwBookingRecord, FwBookingSlot } from './fusswerk-booking.types';
import type { FwSchedulePayload } from './fusswerk-scheduling';
import { notifyFwBookingsChanged } from './fusswerk-booking-sync';
import { getFwBookingClientKey } from './fusswerk-booking-client';

export type FwLoadSlotsOptions = {
  serviceId?: string;
  schedule?: FwSchedulePayload;
  bookings?: FwBookingRecord[];
};

@Injectable({ providedIn: 'root' })
export class FusswerkBookingService {
  private readonly content = inject(FusswerkContentService);

  readonly loadingSlots = signal(false);
  readonly submitting = signal(false);
  readonly lastResult = signal<FwBookingResult | null>(null);
  readonly usingDemoSlots = signal(false);

  async loadSlots(date: string, options?: FwLoadSlotsOptions): Promise<FwBookingSlot[]> {
    const schedule = options?.schedule ?? this.content.schedulePayload();
    const serviceId = options?.serviceId;

    this.loadingSlots.set(true);
    try {
      const res = await fetch('/api/fusswerk/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, serviceId, schedule }),
      });
      if (!res.ok) throw new Error('api');
      const data = await res.json();
      if (!data.ok) throw new Error('api');
      this.usingDemoSlots.set(false);
      return data.slots as FwBookingSlot[];
    } catch {
      this.usingDemoSlots.set(true);
      let bookings: FwBookingRecord[] = options?.bookings ?? [];
      if (!bookings.length) {
        try {
          const res = await fetch('/api/fusswerk/bookings');
          const data = (await res.json()) as { ok?: boolean; bookings?: FwBookingRecord[] };
          if (res.ok && data.ok) bookings = data.bookings ?? [];
        } catch {
          /* ignore */
        }
      }
      return computeSlots(date, schedule, bookings, serviceId);
    } finally {
      this.loadingSlots.set(false);
    }
  }

  async book(payload: {
    name: string;
    phone?: string;
    email?: string;
    date: string;
    slot: string;
    serviceId: string;
  }): Promise<FwBookingResult> {
    const schedule = this.content.schedulePayload();
    this.submitting.set(true);
    try {
      const res = await fetch('/api/fusswerk/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, clientKey: getFwBookingClientKey(), schedule }),
      });
      const data = (await res.json()) as FwBookingResult;
      if (!res.ok) {
        const result = { ok: false, error: data.error || 'Anfrage fehlgeschlagen' };
        this.lastResult.set(result);
        return result;
      }
      const result = { ...data, ok: true };
      this.lastResult.set(result);
      notifyFwBookingsChanged();
      return result;
    } catch {
      const result = {
        ok: false,
        error: 'Buchungsserver nicht erreichbar — bitte „npm run start:api“ starten oder telefonisch anfragen.',
      };
      this.lastResult.set(result);
      return result;
    } finally {
      this.submitting.set(false);
    }
  }

  reset(): void {
    this.lastResult.set(null);
  }
}
