import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import {
  HIDDEN_PREVIEW_SITES,
  PREVIEW_SITES,
  PREVIEW_STUDIO,
  type PreviewSiteId,
} from '../preview.config';
import { STUDIO_PACKAGES, type StudioPackageId } from '../studio-packages.config';
import { StudioPromoService } from '../studio-promo.service';
import { BookingModalService } from '../booking-modal/booking-modal.service';
import { DemoCodeModalService } from '../demo-access/demo-code-modal.service';

@Component({
  selector: 'pv-fiverr-sidebar',
  imports: [RouterLink],
  templateUrl: './fiverr-sidebar.component.html',
  styleUrl: './fiverr-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiverrSidebarComponent {
  private readonly router = inject(Router);
  private readonly promo = inject(StudioPromoService);
  private readonly booking = inject(BookingModalService);
  private readonly demoCode = inject(DemoCodeModalService);

  readonly open = signal(false);
  readonly spotlight = this.promo.spotlight;

  private readonly siteId = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.urlToId(this.router.url)),
      startWith(this.urlToId(this.router.url)),
    ),
    { initialValue: this.urlToId(this.router.url) },
  );

  readonly studio = PREVIEW_STUDIO;
  readonly packages = STUDIO_PACKAGES;
  readonly expandedPackage = signal<StudioPackageId | null>(null);
  readonly themeId = computed(() => this.siteId());
  readonly currentSite = computed(() => {
    const id = this.siteId();
    const visible = PREVIEW_SITES.find((s) => s.id === id);
    if (visible) {
      return visible;
    }
    const hidden = HIDDEN_PREVIEW_SITES[id];
    if (hidden) {
      return { id, ...hidden };
    }
    return PREVIEW_SITES[0];
  });
  readonly otherSites = computed(() =>
    PREVIEW_SITES.filter((s) => s.id !== this.siteId()),
  );

  toggle(): void {
    if (this.spotlight()) {
      this.promo.dismiss();
    }
    this.open.update((v) => !v);
  }

  togglePackage(id: StudioPackageId): void {
    this.expandedPackage.update((current) => (current === id ? null : id));
  }

  isPackageOpen(id: StudioPackageId): boolean {
    return this.expandedPackage() === id;
  }

  openBooking(packageId?: StudioPackageId): void {
    this.booking.open(packageId);
  }

  openDemoCode(): void {
    this.demoCode.open();
  }

  private urlToId(url: string): PreviewSiteId {
    if (url.includes('weisser-schaefer')) {
      return 'weisser-schaefer';
    }
    if (
      url.includes('nasebaer') ||
      url.includes('pfotenatlas') ||
      url.includes('nasenbaer') ||
      url.includes('/demo/dog')
    ) {
      return 'nasebaer';
    }
    if (url.includes('fusswerk')) {
      return 'fusswerk';
    }
    return 'pizzeria';
  }
}
