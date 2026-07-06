import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { FwHoursCardComponent } from '../../components/fw-hours-card.component';
import { FwHoursListComponent } from '../../components/fw-hours-list/fw-hours-list.component';
import { FwLogoComponent } from '../../components/fw-logo.component';
import { FwSocialComponent } from '../../components/fw-social.component';
import { FusswerkBookingWizardUiService } from '../../fusswerk-booking-wizard-ui.service';
import { FW_PAYMENT_METHODS, FW_STEPS, FW_TESTIMONIALS } from '../../fusswerk.data';
import { FW_IMAGES } from '../../fusswerk-booking.types';
import { FusswerkContentService } from '../../fusswerk-content.service';

@Component({
  selector: 'pv-fw-home',
  imports: [RouterLink, FwLogoComponent, FwHoursCardComponent, FwSocialComponent, FwHoursListComponent],
  templateUrl: './home.component.html',
  styleUrls: ['../../fusswerk-shared.scss', './home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwHomeComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly wizardUi = inject(FusswerkBookingWizardUiService);
  readonly content = inject(FusswerkContentService);

  /** Live-Vorschau im Studio-Inhalte-Editor (?embed=studio) */
  readonly isStudioEmbed = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('embed') === 'studio')),
    { initialValue: false },
  );

  readonly biz = this.content.businessView;
  readonly copy = this.content.copy;
  readonly images = FW_IMAGES;
  readonly services = this.content.services;
  readonly prices = this.content.priceTiers;
  readonly steps = FW_STEPS;
  readonly testimonials = FW_TESTIMONIALS;
  readonly trust = this.content.trust;
  readonly hours = this.content.hours;
  readonly paymentMethods = FW_PAYMENT_METHODS;
  readonly menuOpen = signal(false);

  openBooking(): void {
    this.menuOpen.set(false);
    this.wizardUi.show();
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  scrollTo(id: string): void {
    this.menuOpen.set(false);
    if (id === 'top') {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  formatPrice(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
