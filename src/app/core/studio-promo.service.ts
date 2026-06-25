import { Injectable, signal } from '@angular/core';

export const STUDIO_PROMO_STORAGE_KEY = 'pv-studio-promo-dismissed';

/** Shared promo state — spotlight on Studio handle while the visit promo is visible. */
@Injectable({ providedIn: 'root' })
export class StudioPromoService {
  readonly dismissed = signal(this.readDismissed());
  readonly spotlight = signal(false);

  dismiss(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(STUDIO_PROMO_STORAGE_KEY, '1');
    }
    this.dismissed.set(true);
    this.spotlight.set(false);
  }

  setSpotlight(on: boolean): void {
    this.spotlight.set(on && !this.dismissed());
  }

  private readDismissed(): boolean {
    if (typeof sessionStorage === 'undefined') {
      return true;
    }
    return sessionStorage.getItem(STUDIO_PROMO_STORAGE_KEY) === '1';
  }
}
