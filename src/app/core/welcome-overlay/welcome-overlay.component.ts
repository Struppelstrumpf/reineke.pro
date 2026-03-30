import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { PREVIEW_STUDIO } from '../preview.config';

const STORAGE_KEY = 'pv-portfolio-welcome-dismissed';

@Component({
  selector: 'pv-welcome-overlay',
  templateUrl: './welcome-overlay.component.html',
  styleUrl: './welcome-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeOverlayComponent {
  private readonly router = inject(Router);

  readonly studio = PREVIEW_STUDIO;

  private readonly welcomeDismissed = signal(this.readDismissedFromStorage());

  private readonly urlPath = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => normalizePath(this.router.url)),
      startWith(normalizePath(this.router.url)),
    ),
    { initialValue: normalizePath(this.router.url) },
  );

  readonly showWelcome = computed(() => {
    if (this.welcomeDismissed()) {
      return false;
    }
    const p = this.urlPath();
    return p === '/sportflow' || p === '';
  });

  dismiss(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1');
    }
    this.welcomeDismissed.set(true);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showWelcome()) {
      this.dismiss();
    }
  }

  private readDismissedFromStorage(): boolean {
    if (typeof localStorage === 'undefined') {
      return true;
    }
    return localStorage.getItem(STORAGE_KEY) === '1';
  }
}

function normalizePath(url: string): string {
  const path = url.split('?')[0].split('#')[0];
  const trimmed = path.replace(/\/+$/, '') || '/';
  if (trimmed === '/') {
    return '/sportflow';
  }
  return trimmed;
}
