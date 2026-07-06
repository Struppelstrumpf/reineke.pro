import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FwBookingWizardState } from '../fw-booking-wizard.state';

@Component({
  selector: 'pv-fw-wizard-email',
  imports: [FormsModule],
  template: `
    <div class="fw-wiz-step">
      <h2 class="fw-wiz-step__title">Ihre E-Mail-Adresse</h2>
      <p class="fw-wiz-step__lead">Wir senden Ihnen die Bestätigung und Erinnerung dorthin.</p>
      <label class="fw-wiz-field">
        <span class="fw-wiz-field__label">E-Mail</span>
        <input
          type="email"
          autocomplete="email"
          class="fw-wiz-field__input fw-wiz-field__input--lg"
          [ngModel]="state.email()"
          (ngModelChange)="onChange($event)"
          placeholder="name@beispiel.de"
        />
      </label>
    </div>
  `,
  styleUrl: '../wizard-steps.shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwWizardStepEmailComponent {
  readonly state = inject(FwBookingWizardState);
  readonly valid = output<boolean>();

  onChange(value: string): void {
    this.state.email.set(value);
    this.valid.emit(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()));
  }
}
