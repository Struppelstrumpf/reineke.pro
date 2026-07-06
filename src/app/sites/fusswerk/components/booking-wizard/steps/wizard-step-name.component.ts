import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FwBookingWizardState } from '../fw-booking-wizard.state';

@Component({
  selector: 'pv-fw-wizard-name',
  imports: [FormsModule],
  template: `
    <div class="fw-wiz-step">
      <h2 class="fw-wiz-step__title">Wie dürfen wir Sie ansprechen?</h2>
      <p class="fw-wiz-step__lead">Ihr Name erscheint in der Terminbestätigung.</p>
      <label class="fw-wiz-field">
        <span class="fw-wiz-field__label">Vor- und Nachname</span>
        <input
          type="text"
          autocomplete="name"
          class="fw-wiz-field__input fw-wiz-field__input--lg"
          [ngModel]="state.name()"
          (ngModelChange)="onChange($event)"
          placeholder="z. B. Maria Schneider"
        />
      </label>
    </div>
  `,
  styleUrl: '../wizard-steps.shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwWizardStepNameComponent {
  readonly state = inject(FwBookingWizardState);
  readonly valid = output<boolean>();

  onChange(value: string): void {
    this.state.name.set(value);
    this.valid.emit(value.trim().length >= 2);
  }
}
