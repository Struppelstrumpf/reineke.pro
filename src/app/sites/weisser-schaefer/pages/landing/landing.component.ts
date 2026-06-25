import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WeisserSchaeferAuthService } from '../../weisser-schaefer-auth.service';

@Component({
  selector: 'pv-ws-landing',
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrls: ['../../ws-shared.scss', './landing.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WsLandingComponent {
  readonly auth = inject(WeisserSchaeferAuthService);
  readonly showPublicIntro = computed(() => !this.auth.isLoggedIn());

  scrollToSection(sectionId: 'landing-about' | 'landing-benefits' | 'landing-steps'): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
