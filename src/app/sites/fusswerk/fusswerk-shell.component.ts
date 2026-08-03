import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { FwBookingWizardComponent } from './components/booking-wizard/fw-booking-wizard.component';
import { FwOfflineDialogComponent } from './components/fw-offline-dialog.component';
import { FwSupportChatWidgetComponent } from './components/fw-support-chat-widget.component';
import { FusswerkContentService } from './fusswerk-content.service';

@Component({
  selector: 'pv-fusswerk-shell',
  imports: [RouterOutlet, FwSupportChatWidgetComponent, FwBookingWizardComponent, FwOfflineDialogComponent],
  template: `
    <div class="fw-site" [style]="content.themeStyle()">
      <router-outlet />
      <pv-fw-booking-wizard />
      <pv-fw-offline-dialog />
      @if (showChat()) {
        <pv-fw-support-chat-widget />
      }
    </div>
  `,
  styleUrls: ['./fusswerk-shared.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FusswerkShellComponent {
  private readonly router = inject(Router);
  readonly content = inject(FusswerkContentService);

  private readonly routeUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly showChat = computed(() => {
    const url = this.routeUrl();
    if (url.includes('/studio')) return false;
    if (url.includes('embed=studio')) return false;
    return true;
  });
}
