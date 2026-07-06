import { ChangeDetectionStrategy, Component, computed, effect, inject, output, signal } from '@angular/core';
import { FusswerkBookingService } from '../../../fusswerk-booking.service';
import type { FwBookingSlot } from '../../../fusswerk-booking.types';
import { FwBookingWizardState } from '../fw-booking-wizard.state';

@Component({
  selector: 'pv-fw-wizard-time',
  template: `
    <div class="fw-wiz-step fw-wiz-step--time">
      <h2 class="fw-wiz-step__title">Welche Uhrzeit passt?</h2>
      <p class="fw-wiz-step__lead">Freie Zeiten für Ihren gewählten Tag.</p>

      <p class="fw-wiz-date__selected fw-wiz-date__selected--compact">{{ selectedLabel() }}</p>

      <div class="fw-wiz-slots">
        <span class="fw-wiz-field__label">Uhrzeit</span>
        @if (loading()) {
          <p class="fw-wiz-hint">Freie Zeiten werden geladen …</p>
        } @else if (available().length === 0) {
          <p class="fw-wiz-hint fw-wiz-hint--empty">
            An diesem Tag sind leider keine Termine frei — bitte gehen Sie zurück und wählen einen anderen Tag.
          </p>
        } @else {
          <div class="fw-wiz-slots__grid">
            @for (s of available(); track s.time) {
              <button
                type="button"
                class="fw-wiz-slot"
                [class.is-active]="state.slot() === s.time"
                (click)="pickSlot(s.time)"
              >
                {{ s.time }}
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: '../wizard-steps.shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwWizardStepTimeComponent {
  private readonly bookingApi = inject(FusswerkBookingService);
  readonly state = inject(FwBookingWizardState);
  readonly valid = output<boolean>();

  readonly loading = signal(false);
  readonly available = signal<FwBookingSlot[]>([]);
  readonly selectedLabel = computed(() => this.formatSelectedDate(this.state.date()));

  constructor() {
    effect(() => {
      const d = this.state.date();
      const serviceId = this.state.serviceId();
      void this.load(d, serviceId);
    });
  }

  pickSlot(time: string): void {
    this.state.slot.set(time);
    this.valid.emit(true);
  }

  private formatSelectedDate(value: string): string {
    const d = new Date(`${value}T12:00:00`);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  private async load(date: string, serviceId: string): Promise<void> {
    this.loading.set(true);
    const list = await this.bookingApi.loadSlots(date, { serviceId });
    const free = list.filter((s) => s.available);
    this.available.set(free);

    if (this.state.slot() && !free.some((s) => s.time === this.state.slot())) {
      this.state.slot.set('');
    }

    this.loading.set(false);
    this.valid.emit(!!this.state.slot() && free.some((s) => s.time === this.state.slot()));
  }
}
