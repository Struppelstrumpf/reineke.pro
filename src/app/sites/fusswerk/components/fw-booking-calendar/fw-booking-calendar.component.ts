import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FusswerkBookingAdminService, type FwBookingRecord } from '../../fusswerk-booking-admin.service';
import { FusswerkContentService } from '../../fusswerk-content.service';
import type { FwBookingSettings } from '../../fusswerk-content.types';
import type { FwBookingSlot } from '../../fusswerk-booking.types';
import { formatDurationShort } from '../../fusswerk-duration.util';
import { clampGapBeforeBookingMinutes, computeSlots } from '../../fusswerk-scheduling';
import {
  hasSameCustomerDuplicateOnDay,
  sameCustomerBookingsOnDay,
} from '../../fusswerk-booking-customer.util';

type ModalMode = 'view' | 'create' | 'reschedule' | 'settings' | 'duplicates' | null;

@Component({
  selector: 'pv-fw-booking-calendar',
  imports: [FormsModule],
  templateUrl: './fw-booking-calendar.component.html',
  styleUrls: ['../../fusswerk-shared.scss', './fw-booking-calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwBookingCalendarComponent {
  protected readonly Math = Math;

  readonly bookings = inject(FusswerkBookingAdminService);
  readonly content = inject(FusswerkContentService);

  readonly viewMonth = signal(this.monthKey(new Date()));
  readonly selectedDate = signal(this.todayPlus(1));
  readonly slots = signal<FwBookingSlot[]>([]);
  readonly slotsLoading = signal(false);
  readonly actionError = signal('');
  readonly actionBusy = signal(false);

  readonly modalMode = signal<ModalMode>(null);
  readonly activeBooking = signal<FwBookingRecord | null>(null);
  readonly createSlot = signal('');
  readonly createName = signal('');
  readonly createPhone = signal('');
  readonly createEmail = signal('');
  readonly createServiceId = signal('classic');
  readonly rescheduleDate = signal('');
  readonly rescheduleSlot = signal('');
  readonly rescheduleMode = signal<'direct' | 'request'>('direct');

  readonly duplicateGroup = signal<FwBookingRecord[]>([]);
  readonly keepBookingId = signal('');

  readonly settingsDraft = signal<FwBookingSettings>(this.content.bookingSettings());
  readonly gapPickerOpen = signal(false);
  readonly gapPickerDraft = signal(this.content.bookingSettings().gapBeforeBookingMinutes ?? 45);

  readonly serviceOptions = computed(() => this.content.services());
  readonly weekdayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  readonly serviceLabels = computed(() =>
    Object.fromEntries(this.content.services().map((s) => [s.id, s.title])),
  );

  readonly monthLabel = computed(() => {
    const [y, m] = this.viewMonth().split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  });

  readonly calendarDays = computed(() => {
    const [y, m] = this.viewMonth().split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m, 0).getDate();
    const today = this.dateKey(new Date());
    const cells: Array<{ key: string; day: number; inMonth: boolean; date: string; isPast: boolean }> = [];

    for (let i = 0; i < startPad; i++) {
      const d = new Date(y, m - 1, -startPad + i + 1);
      const date = this.dateKey(d);
      cells.push({
        key: `p-${date}`,
        day: d.getDate(),
        inMonth: false,
        date,
        isPast: date < today,
      });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ key: date, day, inMonth: true, date, isPast: date < today });
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1];
      const d = new Date(`${last.date}T12:00:00`);
      d.setDate(d.getDate() + 1);
      const date = this.dateKey(d);
      cells.push({
        key: `n-${date}`,
        day: d.getDate(),
        inMonth: false,
        date,
        isPast: date < today,
      });
    }
    return cells;
  });

  constructor() {
    effect(() => {
      const date = this.selectedDate();
      this.content.bookingSettings();
      this.content.openingHours();
      const serviceId = this.modalMode() === 'create' ? this.createServiceId() : undefined;
      void this.loadSlotsFor(date, serviceId);
    });

    effect(() => {
      this.bookings.revision();
      const date = this.selectedDate();
      const serviceId = this.modalMode() === 'create' ? this.createServiceId() : undefined;
      this.applySlotsLocally(date, serviceId);
    });
  }

  bookingsOn(date: string): FwBookingRecord[] {
    return this.bookings.byDate().get(date) ?? [];
  }

  bookingCount(date: string): number {
    return this.bookingsOn(date).length;
  }

  pendingCount(date: string): number {
    return this.bookingsOn(date).filter((b) => b.status === 'pending').length;
  }

  hasDuplicateWarning(booking: FwBookingRecord): boolean {
    return hasSameCustomerDuplicateOnDay(booking, this.bookingsOn(booking.date));
  }

  hasSlotDuplicate(slot: FwBookingSlot): boolean {
    if (!slot.booking) return false;
    const full = this.bookings.all().find((b) => b.id === slot.booking?.id);
    return full ? this.hasDuplicateWarning(full) : false;
  }

  duplicateSiblings(booking: FwBookingRecord): FwBookingRecord[] {
    return sameCustomerBookingsOnDay(booking, this.bookingsOn(booking.date));
  }

  selectDate(date: string): void {
    this.selectedDate.set(date);
    if (!date.startsWith(this.viewMonth())) {
      this.viewMonth.set(date.slice(0, 7));
    }
  }

  prevMonth(): void {
    const [y, m] = this.viewMonth().split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    this.viewMonth.set(this.monthKey(d));
  }

  nextMonth(): void {
    const [y, m] = this.viewMonth().split('-').map(Number);
    const d = new Date(y, m, 1);
    this.viewMonth.set(this.monthKey(d));
  }

  slotClass(slot: FwBookingSlot): string {
    if (slot.booking) {
      return slot.booking.status === 'pending' ? 'is-pending' : 'is-booked';
    }
    if (this.isPastDate(this.selectedDate())) {
      return 'is-past';
    }
    if (slot.available) return 'is-free';
    if (slot.staffBookable) return 'is-staff-only';
    return 'is-blocked';
  }

  slotDisabled(slot: FwBookingSlot): boolean {
    if (slot.booking) return false;
    if (this.isPastDate(this.selectedDate())) return true;
    return !slot.available && !slot.staffBookable;
  }

  openSettings(): void {
    const settings = { ...this.content.bookingSettings() };
    this.settingsDraft.set(settings);
    this.gapPickerDraft.set(settings.gapBeforeBookingMinutes ?? 45);
    this.gapPickerOpen.set(false);
    this.modalMode.set('settings');
  }

  openGapPicker(): void {
    this.gapPickerDraft.set(this.settingsDraft().gapBeforeBookingMinutes ?? 45);
    this.gapPickerOpen.set(true);
  }

  closeGapPicker(): void {
    this.gapPickerOpen.set(false);
  }

  applyGapPicker(): void {
    const next = clampGapBeforeBookingMinutes(this.gapPickerDraft());
    this.updateSettingsDraft({ gapBeforeBookingMinutes: next });
    this.gapPickerOpen.set(false);
  }

  saveSettings(): void {
    this.content.saveBookingSettings({ ...this.settingsDraft() });
    this.closeModal();
    void this.loadSlotsFor(this.selectedDate());
  }

  updateSettingsDraft(partial: Partial<FwBookingSettings>): void {
    this.settingsDraft.update((s) => ({ ...s, ...partial }));
  }

  onCreateServiceChange(serviceId: string): void {
    this.createServiceId.set(serviceId);
    void this.loadSlotsFor(this.selectedDate(), serviceId);
  }

  serviceDurationLabel(service: { durationMinutes: number }): string {
    return formatDurationShort(service.durationMinutes);
  }

  openSlot(slot: FwBookingSlot): void {
    if (slot.booking) {
      const full = this.bookings.all().find((b) => b.id === slot.booking?.id) ?? null;
      this.activeBooking.set(full);
      this.modalMode.set('view');
      return;
    }
    if (this.isPastDate(this.selectedDate())) return;
    if (!slot.available && !slot.staffBookable) return;
    this.openNewAppointment(slot.time);
  }

  openNewAppointment(slotTime?: string): void {
    if (this.isPastDate(this.selectedDate())) return;
    const pick =
      this.slots().find((s) => s.available) ??
      this.slots().find((s) => s.staffBookable);
    this.createSlot.set(slotTime ?? pick?.time ?? '09:00');
    this.createName.set('');
    this.createPhone.set('');
    this.createEmail.set('');
    this.modalMode.set('create');
  }

  closeModal(): void {
    this.modalMode.set(null);
    this.activeBooking.set(null);
    this.duplicateGroup.set([]);
    this.keepBookingId.set('');
    this.actionError.set('');
  }

  openDuplicateResolve(booking: FwBookingRecord): void {
    const siblings = this.duplicateSiblings(booking);
    this.duplicateGroup.set(siblings);
    this.keepBookingId.set(booking.id);
    this.actionError.set('');
    this.modalMode.set('duplicates');
  }

  keepAllDuplicates(): void {
    const active = this.activeBooking();
    this.actionError.set('');
    this.modalMode.set(active ? 'view' : null);
    this.duplicateGroup.set([]);
  }

  async keepOnlySelectedDuplicate(): Promise<void> {
    const keepId = this.keepBookingId();
    const cancelIds = this.duplicateGroup()
      .filter((b) => b.id !== keepId && b.status !== 'cancelled')
      .map((b) => b.id);
    if (!cancelIds.length) {
      this.keepAllDuplicates();
      return;
    }
    await this.runBulkCancel(cancelIds, 'view', keepId);
  }

  async deleteAllDuplicates(): Promise<void> {
    const cancelIds = this.duplicateGroup()
      .filter((b) => b.status !== 'cancelled')
      .map((b) => b.id);
    if (!cancelIds.length) {
      this.closeModal();
      return;
    }
    await this.runBulkCancel(cancelIds, null);
  }

  openReschedule(): void {
    const b = this.activeBooking();
    if (!b) return;
    this.rescheduleDate.set(b.date);
    this.rescheduleSlot.set(b.slot);
    this.rescheduleMode.set('direct');
    this.modalMode.set('reschedule');
  }

  async confirmBooking(): Promise<void> {
    const b = this.activeBooking();
    if (!b) return;
    await this.runAction(() => this.bookings.confirm(b.id));
  }

  async cancelBooking(): Promise<void> {
    const b = this.activeBooking();
    if (!b) return;
    await this.runAction(() => this.bookings.cancel(b.id));
  }

  async submitReschedule(): Promise<void> {
    const b = this.activeBooking();
    if (!b) return;
    await this.runAction(() =>
      this.bookings.reschedule(b.id, this.rescheduleDate(), this.rescheduleSlot(), this.rescheduleMode()),
    );
  }

  async submitCreate(): Promise<void> {
    if (this.isPastDate(this.selectedDate())) {
      this.actionError.set('Termine können nicht in der Vergangenheit angelegt werden.');
      return;
    }
    if (this.createName().trim().length < 2) {
      this.actionError.set('Bitte einen Namen angeben.');
      return;
    }
    await this.runAction(() =>
      this.bookings.createManual({
        name: this.createName(),
        phone: this.createPhone(),
        email: this.createEmail(),
        date: this.selectedDate(),
        slot: this.createSlot(),
        serviceId: this.createServiceId(),
        status: 'confirmed',
      }),
    );
  }

  statusLabel(status: string): string {
    if (status === 'confirmed') return 'Bestätigt';
    if (status === 'cancelled') return 'Abgesagt';
    return 'Anfrage';
  }

  formatDate(date: string): string {
    return new Date(`${date}T12:00:00`).toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
  }

  isPastDate(date: string): boolean {
    return date < this.dateKey(new Date());
  }

  private dateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private async runBulkCancel(
    ids: string[],
    thenMode: ModalMode,
    keepId?: string,
  ): Promise<void> {
    this.actionBusy.set(true);
    this.actionError.set('');
    const err = await this.bookings.cancelMany(ids);
    this.actionBusy.set(false);
    if (err) {
      this.actionError.set(err);
      return;
    }
    this.duplicateGroup.set([]);
    await this.loadSlotsFor(this.selectedDate());
    if (thenMode === 'view' && keepId) {
      const kept = this.bookings.all().find((b) => b.id === keepId) ?? null;
      this.activeBooking.set(kept);
      this.modalMode.set(kept ? 'view' : null);
      return;
    }
    this.closeModal();
  }

  private async runAction(fn: () => Promise<string | null>): Promise<void> {
    this.actionBusy.set(true);
    this.actionError.set('');
    const err = await fn();
    this.actionBusy.set(false);
    if (err) {
      this.actionError.set(err);
      return;
    }
    this.closeModal();
    await this.loadSlotsFor(this.selectedDate());
  }

  private applySlotsLocally(date: string, serviceId?: string): void {
    this.slots.set(computeSlots(date, this.content.schedulePayload(), this.bookings.all(), serviceId));
  }

  private async loadSlotsFor(date: string, serviceId?: string): Promise<void> {
    this.slotsLoading.set(true);
    this.slots.set(await this.bookings.loadSlots(date, serviceId));
    this.slotsLoading.set(false);
  }

  private monthKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private todayPlus(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    while (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return this.dateKey(d);
  }
}
