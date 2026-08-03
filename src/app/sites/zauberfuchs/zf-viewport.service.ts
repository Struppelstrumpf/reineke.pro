import { DestroyRef, Injectable, inject, signal } from '@angular/core';

export type ZfDevice = 'mobile' | 'tablet' | 'desktop';

/** Viewport-/Gerätetyp für Zauberfuchs-Layout (CSS + Logik). */
@Injectable({ providedIn: 'root' })
export class ZfViewportService {
  private readonly destroyRef = inject(DestroyRef);

  readonly device = signal<ZfDevice>('desktop');
  readonly isTouch = signal(false);
  readonly width = signal(typeof window !== 'undefined' ? window.innerWidth : 1200);

  constructor() {
    if (typeof window === 'undefined') return;

    const sync = () => {
      const w = window.innerWidth;
      this.width.set(w);
      this.isTouch.set(window.matchMedia('(hover: none), (pointer: coarse)').matches);
      if (w < 768) this.device.set('mobile');
      else if (w < 1100) this.device.set('tablet');
      else this.device.set('desktop');

      document.documentElement.dataset['zfDevice'] = this.device();
      document.documentElement.dataset['zfTouch'] = this.isTouch() ? '1' : '0';
    };

    sync();
    window.addEventListener('resize', sync, { passive: true });
    this.destroyRef.onDestroy(() => window.removeEventListener('resize', sync));
  }
}
