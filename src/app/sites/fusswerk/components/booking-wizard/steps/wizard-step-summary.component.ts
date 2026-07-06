import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { FusswerkContentService } from '../../../fusswerk-content.service';
import { FwBookingWizardState } from '../fw-booking-wizard.state';

@Component({
  selector: 'pv-fw-wizard-summary',
  template: `
    <div class="fw-wiz-step">
      <h2 class="fw-wiz-step__title">Alles in Ordnung?</h2>
      <p class="fw-wiz-step__lead">Bitte prüfen Sie Ihre Angaben — danach senden wir die Anfrage ab.</p>

      <dl class="fw-wiz-recap">
        @if (selectedService(); as service) {
          <div class="fw-wiz-recap__service-row">
            <dt>Leistung</dt>
            <dd>
              <span class="fw-wiz-recap__service-name">{{ service.label }}</span>
              <span class="fw-wiz-recap__meta">{{ service.note }} · {{ service.duration }}</span>
              <span class="fw-wiz-recap__price">ab {{ formatPrice(service.price) }}</span>
            </dd>
          </div>
        }
        <div>
          <dt>Name</dt>
          <dd>{{ state.name() }}</dd>
        </div>
        @if (state.phone()) {
          <div>
            <dt>Telefon</dt>
            <dd>{{ state.phone() }}</dd>
          </div>
        }
        @if (state.email()) {
          <div>
            <dt>E-Mail</dt>
            <dd>{{ state.email() }}</dd>
          </div>
        }
        <div class="fw-wiz-recap__when">
          <dt>Termin</dt>
          <dd>
            <span class="fw-wiz-recap__when-date">{{ dateLabel() }}</span>
            <span class="fw-wiz-recap__when-time">{{ state.slot() }} Uhr</span>
          </dd>
        </div>
      </dl>
    </div>
  `,
  styleUrl: '../wizard-steps.shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwWizardStepSummaryComponent {
  private readonly content = inject(FusswerkContentService);
  readonly state = inject(FwBookingWizardState);
  readonly valid = output<boolean>();

  readonly selectedService = computed(() =>
    this.content.bookingServices().find((s) => s.id === this.state.serviceId()) ?? null,
  );

  constructor() {
    this.valid.emit(true);
  }

  dateLabel(): string {
    const d = new Date(`${this.state.date()}T12:00:00`);
    return d.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  formatPrice(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
