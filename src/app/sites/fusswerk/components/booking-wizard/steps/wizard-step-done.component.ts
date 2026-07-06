import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FusswerkBookingService } from '../../../fusswerk-booking.service';
import { FwBookingWizardState } from '../fw-booking-wizard.state';

@Component({
  selector: 'pv-fw-wizard-done',
  template: `
    <div class="fw-wiz-step fw-wiz-step--done">
      <div class="fw-wiz-done__icon" aria-hidden="true">✓</div>
      <h2 class="fw-wiz-step__title">Anfrage gesendet</h2>
      <p class="fw-wiz-step__lead fw-wiz-done__thanks">
        Vielen Dank, {{ state.name() }}! Wir melden uns per E-Mail bei {{ state.email() }}.
      </p>
      @if (result()?.message) {
        <p class="fw-wiz-hint fw-wiz-hint--demo">{{ result()?.message }}</p>
      }
      @if (result()?.emails; as emails) {
        <button type="button" class="fw-wiz-preview-toggle" (click)="toggleEmails()">
          {{ showEmails() ? 'Vorschau ausblenden' : 'E-Mail-Vorschau anzeigen' }}
        </button>
        @if (showEmails()) {
          <div class="fw-wiz-mail">
            <p class="fw-wiz-mail__subject">{{ emails.customer.subject }}</p>
            <div class="fw-wiz-mail__frame" [innerHTML]="safeHtml(emails.customer.html)"></div>
          </div>
        }
      }
    </div>
  `,
  styleUrl: '../wizard-steps.shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwWizardStepDoneComponent {
  private readonly sanitizer = inject(DomSanitizer);
  readonly state = inject(FwBookingWizardState);
  private readonly bookingApi = inject(FusswerkBookingService);
  readonly result = this.bookingApi.lastResult;
  readonly showEmails = signal(false);

  toggleEmails(): void {
    this.showEmails.update((v) => !v);
  }

  safeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
