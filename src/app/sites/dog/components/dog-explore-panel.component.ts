import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { type DogAlert } from '../dog.data';
import { DogExploreService } from '../dog-explore.service';
import { dogGoogleMapsOpen, dogGoogleMapsRoute } from '../dog-maps.util';
import {
  DOG_PANEL_TAGLINE_MEASURE,
  DOG_PANEL_TAGLINES,
} from '../dog-taglines.data';
import { tipIdForAlert } from '../dog-tips.data';
import { DOG_SPOT_EMOJI, DOG_SPOT_LABELS } from '../dog.data';
import { DogWeatherWidgetComponent } from './dog-weather-widget.component';

const TAGLINE_INTERVAL_MS = 5000;

@Component({
  selector: 'pv-dog-explore-panel',
  imports: [DecimalPipe, DogWeatherWidgetComponent],
  templateUrl: './dog-explore-panel.component.html',
  styleUrl: './dog-explore-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogExplorePanelComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly panelScroll = viewChild<ElementRef<HTMLElement>>('panelScroll');
  private readonly detailBlock = viewChild<ElementRef<HTMLElement>>('detailBlock');

  readonly explore = inject(DogExploreService);
  readonly spotLabels = DOG_SPOT_LABELS;
  readonly spotEmoji = DOG_SPOT_EMOJI;

  readonly taglineMeasure = DOG_PANEL_TAGLINE_MEASURE;
  readonly taglineIndex = signal(0);
  readonly taglineWord = computed(() => DOG_PANEL_TAGLINES[this.taglineIndex()]);
  readonly taglineAnim = signal<'idle' | 'exit' | 'enter'>('idle');
  readonly removingPin = signal(false);

  constructor() {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReduced) {
      interval(TAGLINE_INTERVAL_MS)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.cycleTagline());
    }

    effect(() => {
      this.explore.panelScrollTick();
      queueMicrotask(() => this.scrollActiveIntoView());
    });

    effect(() => {
      this.explore.panelDetailScrollTick();
      queueMicrotask(() => {
        this.detailBlock()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
  }

  togglePanel(): void {
    this.explore.panelOpen.update((v) => !v);
  }

  selectSpot(id: string): void {
    this.explore.openSpotFromList(id);
  }

  selectAlert(id: string): void {
    this.explore.openAlertFromList(id);
  }

  leashClass(): string {
    const mood = this.explore.leashStatus().mood;
    return `dog-panel__status--${mood}`;
  }

  openTip(id: string): void {
    this.explore.openTip(id);
  }

  alertTipId(alert: DogAlert): string {
    return tipIdForAlert(alert.kind, alert.id);
  }

  showAlert(id: string, event: Event): void {
    event.stopPropagation();
    this.explore.showAlert(id);
  }

  async removeOwnPin(id: string): Promise<void> {
    if (this.removingPin()) return;
    this.removingPin.set(true);
    const ok = await this.explore.removeOwnPin(id);
    this.removingPin.set(false);
    if (!ok) return;
  }

  mapsOpenUrl(lat: number, lng: number): string {
    return dogGoogleMapsOpen(lat, lng);
  }

  mapsRouteUrl(toLat: number, toLng: number): string {
    const c = this.explore.center();
    return dogGoogleMapsRoute(c.lat, c.lng, toLat, toLng);
  }

  private scrollActiveIntoView(): void {
    const body = this.panelScroll()?.nativeElement;
    if (!body) return;

    const active = body.querySelector<HTMLElement>('.dog-spot.is-active, .dog-alert.is-active');
    active?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  private cycleTagline(): void {
    this.taglineAnim.set('exit');
    window.setTimeout(() => {
      this.taglineIndex.update((i) => (i + 1) % DOG_PANEL_TAGLINES.length);
      this.taglineAnim.set('enter');
      window.setTimeout(() => this.taglineAnim.set('idle'), 450);
    }, 320);
  }
}
