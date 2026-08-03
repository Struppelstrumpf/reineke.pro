import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { BookingModalComponent } from './core/booking-modal/booking-modal.component';
import { BookingModalService } from './core/booking-modal/booking-modal.service';
import { DemoCodeModalComponent } from './core/demo-access/demo-code-modal.component';
import { DemoThemeService } from './core/demo-access/demo-theme.service';
import { FiverrSidebarComponent } from './core/fiverr-sidebar/fiverr-sidebar.component';
import { WelcomeOverlayComponent } from './core/welcome-overlay/welcome-overlay.component';
import { isZauberfuchsHost } from './core/site-host';

@Component({
  selector: 'pv-root',
  imports: [
    RouterOutlet,
    FiverrSidebarComponent,
    WelcomeOverlayComponent,
    BookingModalComponent,
    DemoCodeModalComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly title = 'Reineke GbR — Portfolio';
  readonly booking = inject(BookingModalService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  // Initialisiert das gespeicherte Farblayout beim App-Start.
  readonly demoTheme = inject(DemoThemeService);

  readonly isMobileViewport = signal(false);
  private readonly standaloneSite = isZauberfuchsHost();

  private readonly routeUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** Live-Vorschau / Standalone-Sites — ohne Portfolio-Overlay. */
  readonly hidePortfolioChrome = computed(() => {
    if (this.standaloneSite) return true;
    const url = this.routeUrl();
    return url.includes('embed=studio') || url.includes('/demo/zauberfuchs');
  });

  /** Fusswerk-Studio mobil / Standalone: kein Portfolio-Handle. */
  readonly hideFiverrSidebar = computed(() => {
    if (this.standaloneSite) return true;
    const url = this.routeUrl();
    if (url.includes('/demo/zauberfuchs')) return true;
    if (url.includes('embed=studio')) return true;
    if (url.includes('/fusswerk/angebot')) return true;
    return this.isMobileViewport() && url.includes('/fusswerk/studio');
  });

  constructor() {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(max-width: 768px)');
      const sync = () => this.isMobileViewport.set(mq.matches);
      sync();
      mq.addEventListener('change', sync);
      this.destroyRef.onDestroy(() => mq.removeEventListener('change', sync));
    }
  }
}
