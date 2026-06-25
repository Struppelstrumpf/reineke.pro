import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, interval, map, startWith } from 'rxjs';
import { BookingModalService } from '../booking-modal/booking-modal.service';
import { StudioPromoService } from '../studio-promo.service';

const ROTATOR_WORDS = [
  'eine professionelle Website?',
  'einen Auftritt wie dieser?',
  'mehr Sichtbarkeit?',
  'Kunden, die von selbst kommen?',
  'dein digitales Schaufenster?',
] as const;

const ROTATOR_MEASURE_TEXT = 'Kunden, die von selbst kommen?';

@Component({
  selector: 'pv-welcome-overlay',
  templateUrl: './welcome-overlay.component.html',
  styleUrl: './welcome-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeOverlayComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly promo = inject(StudioPromoService);
  private readonly booking = inject(BookingModalService);

  private readonly urlPath = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => normalizePath(this.router.url)),
      startWith(normalizePath(this.router.url)),
    ),
    { initialValue: normalizePath(this.router.url) },
  );

  readonly rotatorWords = ROTATOR_WORDS;
  readonly rotatorMeasureText = ROTATOR_MEASURE_TEXT;
  readonly wordIndex = signal(0);
  readonly rotatorWord = computed(() => this.rotatorWords[this.wordIndex()]);
  readonly rotatorAnim = signal<'idle' | 'exit' | 'enter'>('idle');

  readonly showWelcome = computed(() => {
    if (this.promo.dismissed() || this.booking.dimmed() || this.booking.visible()) {
      return false;
    }
    const p = this.urlPath();
    return p === '/pizzeria-demo' || p === '';
  });

  constructor() {
    effect(() => {
      this.promo.setSpotlight(this.showWelcome());
    });

    effect((onCleanup) => {
      if (!this.showWelcome()) {
        return;
      }

      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReduced) {
        return;
      }

      const sub = interval(3200)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.cycleWord());

      onCleanup(() => sub.unsubscribe());
    });
  }

  dismiss(): void {
    this.promo.dismiss();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.dismiss();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showWelcome()) {
      this.dismiss();
    }
  }

  private cycleWord(): void {
    this.rotatorAnim.set('exit');
    window.setTimeout(() => {
      this.wordIndex.update((i) => (i + 1) % this.rotatorWords.length);
      this.rotatorAnim.set('enter');
      window.setTimeout(() => this.rotatorAnim.set('idle'), 450);
    }, 320);
  }
}

function normalizePath(url: string): string {
  const path = url.split('?')[0].split('#')[0];
  const trimmed = path.replace(/\/+$/, '') || '/';
  if (trimmed === '/') {
    return '/pizzeria-demo';
  }
  return trimmed;
}
