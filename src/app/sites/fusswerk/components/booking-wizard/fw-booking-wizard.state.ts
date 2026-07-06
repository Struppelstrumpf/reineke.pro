import { Injectable, signal } from '@angular/core';

export const FW_WIZARD_STEPS = [
  'Leistung',
  'Name',
  'Kontakt',
  'Datum',
  'Uhrzeit',
  'Bestätigung',
] as const;

export const FW_WIZARD_DONE_STEP = FW_WIZARD_STEPS.length;

@Injectable()
export class FwBookingWizardState {
  readonly step = signal(0);
  readonly serviceId = signal('classic');
  readonly name = signal('');
  readonly phone = signal('');
  readonly email = signal('');
  readonly date = signal(this.defaultDate());
  readonly slot = signal('');

  private defaultDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  reset(): void {
    this.step.set(0);
    this.serviceId.set('classic');
    this.name.set('');
    this.phone.set('');
    this.email.set('');
    this.date.set(this.defaultDate());
    this.slot.set('');
  }
}
