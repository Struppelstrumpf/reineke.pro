import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { FusswerkContentService } from '../../../fusswerk-content.service';
import { FwBookingWizardState } from '../fw-booking-wizard.state';

@Component({
  selector: 'pv-fw-wizard-service',
  template: `
    <div class="fw-wiz-step fw-wiz-step--services">
      <h2 class="fw-wiz-step__title">Welche Behandlung wünschen Sie?</h2>
      <p class="fw-wiz-step__lead">Preise inkl. — wählen Sie die passende Leistung.</p>
      <ul class="fw-wiz-pick fw-wiz-pick--services">
        @for (s of services(); track s.id) {
          <li>
            <button
              type="button"
              class="fw-wiz-pick__item"
              [class.is-active]="state.serviceId() === s.id"
              (click)="pick(s.id)"
            >
              <span class="fw-wiz-pick__main">
                <span class="fw-wiz-pick__label">{{ s.label }}</span>
                <span class="fw-wiz-pick__note">{{ s.note }} · {{ s.duration }}</span>
              </span>
              <span class="fw-wiz-pick__price">
                <span class="fw-wiz-pick__from">ab</span>
                {{ formatPrice(s.price) }}
              </span>
            </button>
          </li>
        }
      </ul>
    </div>
  `,
  styleUrl: '../wizard-steps.shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwWizardStepServiceComponent {
  private readonly content = inject(FusswerkContentService);
  readonly state = inject(FwBookingWizardState);
  readonly services = this.content.bookingServices;
  readonly valid = output<boolean>();

  constructor() {
    this.valid.emit(true);
  }

  pick(id: string): void {
    this.state.serviceId.set(id);
    this.valid.emit(true);
  }

  formatPrice(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  }
}