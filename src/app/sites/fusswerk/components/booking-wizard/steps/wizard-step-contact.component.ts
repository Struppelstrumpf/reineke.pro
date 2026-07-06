import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { isValidEmail, sanitizeEmail, sanitizePhone } from '../../../fusswerk-security';
import { FwBookingWizardState } from '../fw-booking-wizard.state';

@Component({
  selector: 'pv-fw-wizard-contact',
  imports: [FormsModule],
  template: `
    <div class="fw-wiz-step">
      <h2 class="fw-wiz-step__title">Wie erreichen wir Sie?</h2>
      <p class="fw-wiz-step__lead">Telefon und E-Mail sind optional — mindestens einer hilft uns bei Rückfragen.</p>
      <label class="fw-wiz-field">
        <span class="fw-wiz-field__label">Telefon <em>(optional)</em></span>
        <input
          type="tel"
          autocomplete="tel"
          class="fw-wiz-field__input fw-wiz-field__input--lg"
          [ngModel]="state.phone()"
          (ngModelChange)="onPhone($event)"
          placeholder="05424 …"
        />
      </label>
      <label class="fw-wiz-field">
        <span class="fw-wiz-field__label">E-Mail <em>(optional)</em></span>
        <input
          type="email"
          autocomplete="email"
          class="fw-wiz-field__input fw-wiz-field__input--lg"
          [ngModel]="state.email()"
          (ngModelChange)="onEmail($event)"
          placeholder="name@beispiel.de"
        />
      </label>
    </div>
  `,
  styleUrl: '../wizard-steps.shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwWizardStepContactComponent {
  readonly state = inject(FwBookingWizardState);
  readonly valid = output<boolean>();

  constructor() {
    this.valid.emit(true);
  }

  onPhone(value: string): void {
    this.state.phone.set(sanitizePhone(value));
    this.emitValid();
  }

  onEmail(value: string): void {
    this.state.email.set(sanitizeEmail(value));
    this.emitValid();
  }

  private emitValid(): void {
    this.valid.emit(isValidEmail(this.state.email()));
  }
}
