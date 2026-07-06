import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { FusswerkBookingService } from '../../fusswerk-booking.service';
import { FusswerkBookingWizardUiService } from '../../fusswerk-booking-wizard-ui.service';
import {
  FW_WIZARD_DONE_STEP,
  FW_WIZARD_STEPS,
  FwBookingWizardState,
} from './fw-booking-wizard.state';
import { FwWizardStepContactComponent } from './steps/wizard-step-contact.component';
import { FwWizardStepDateComponent } from './steps/wizard-step-date.component';
import { FwWizardStepDoneComponent } from './steps/wizard-step-done.component';
import { FwWizardStepNameComponent } from './steps/wizard-step-name.component';
import { FwWizardStepServiceComponent } from './steps/wizard-step-service.component';
import { FwWizardStepSummaryComponent } from './steps/wizard-step-summary.component';
import { FwWizardStepTimeComponent } from './steps/wizard-step-time.component';

@Component({
  selector: 'pv-fw-booking-wizard',
  imports: [
    FwWizardStepServiceComponent,
    FwWizardStepNameComponent,
    FwWizardStepContactComponent,
    FwWizardStepDateComponent,
    FwWizardStepTimeComponent,
    FwWizardStepSummaryComponent,
    FwWizardStepDoneComponent,
  ],
  providers: [FwBookingWizardState],
  styleUrls: ['../../fusswerk-shared.scss', './fw-booking-wizard.component.scss'],
  templateUrl: './fw-booking-wizard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwBookingWizardComponent {
  private readonly wizardState = inject(FwBookingWizardState);
  private readonly bookingApi = inject(FusswerkBookingService);
  private readonly ui = inject(FusswerkBookingWizardUiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly step = this.wizardState.step;
  readonly stepLabels = FW_WIZARD_STEPS;
  readonly doneStep = FW_WIZARD_DONE_STEP;
  readonly canAdvance = signal(true);
  readonly submitting = signal(false);
  readonly submitError = signal('');
  readonly usingDemoSlots = this.bookingApi.usingDemoSlots;
  readonly open = this.ui.open;
  private wasOpen = false;

  constructor() {
    effect(() => {
      if (typeof document === 'undefined') return;
      document.body.style.overflow = this.open() ? 'hidden' : '';
    });

    effect(() => {
      const isOpen = this.open();
      if (this.wasOpen && !isOpen) {
        this.wizardState.reset();
        this.submitError.set('');
        this.bookingApi.reset();
      }
      this.wasOpen = isOpen;
    });

    if (typeof window !== 'undefined') {
      fromEvent(window, 'popstate')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.ui.onPopState());
    }
  }

  close(): void {
    this.ui.hide();
  }

  onValid(valid: boolean): void {
    this.canAdvance.set(valid);
  }

  back(): void {
    const s = this.step();
    if (s === 0) {
      this.close();
      return;
    }
    if (s === FW_WIZARD_DONE_STEP) return;
    this.submitError.set('');
    this.step.update((n) => n - 1);
    this.canAdvance.set(true);
  }

  async next(): Promise<void> {
    if (this.submitting()) return;

    const s = this.step();
    const summaryStep = FW_WIZARD_STEPS.length - 1;
    const timeStep = summaryStep - 1;

    if (s === summaryStep) {
      this.submitting.set(true);
      this.submitError.set('');
      const st = this.wizardState;
      const slots = await this.bookingApi.loadSlots(st.date(), { serviceId: st.serviceId() });
      const stillFree = slots.some((slot) => slot.time === st.slot() && slot.available);
      if (!stillFree) {
        this.submitting.set(false);
        this.submitError.set(
          'Dieser Termin ist leider nicht mehr verfügbar. Bitte wählen Sie eine andere Uhrzeit.',
        );
        this.step.set(timeStep);
        this.canAdvance.set(false);
        return;
      }
      const res = await this.bookingApi.book({
        name: st.name().trim(),
        phone: st.phone().trim(),
        email: st.email().trim(),
        date: st.date(),
        slot: st.slot(),
        serviceId: st.serviceId(),
      });
      this.submitting.set(false);
      if (!res.ok) {
        this.submitError.set(
          res.error === 'Ungültiger Termin'
            ? 'Dieser Termin ist leider nicht mehr verfügbar. Bitte wählen Sie eine andere Uhrzeit.'
            : res.error || 'Anfrage fehlgeschlagen',
        );
        return;
      }
      this.step.set(FW_WIZARD_DONE_STEP);
      return;
    }

    if (s >= FW_WIZARD_DONE_STEP) return;
    if (!this.canAdvance()) return;
    this.step.update((n) => n + 1);
    this.canAdvance.set(s + 1 !== timeStep);
  }

  nextLabel(): string {
    const s = this.step();
    if (s === FW_WIZARD_STEPS.length - 1) return 'Anfrage absenden';
    return 'Weiter';
  }
}
