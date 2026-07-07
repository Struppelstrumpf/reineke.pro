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

  private readonly routeUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** Live-Vorschau im Fusswerk-Studio — ohne Portfolio-Leiste links. */
  readonly hidePortfolioChrome = computed(() => this.routeUrl().includes('embed=studio'));

  /** Fusswerk-Studio mobil: kein Portfolio-„Studio“-Handle links (mehr Platz für Kalender). */
  readonly hideFiverrSidebar = computed(() => {
    const url = this.routeUrl();
    if (url.includes('embed=studio')) return true;
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
