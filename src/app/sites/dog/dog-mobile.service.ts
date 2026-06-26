import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** Erkennt Handys — unabhängig von exakter Auflösung (Breite + Touch). */
@Injectable({ providedIn: 'root' })
export class DogMobileService {
  private readonly destroyRef = inject(DestroyRef);

  readonly isMobile = signal(false);
  readonly menuOpen = signal(false);
  readonly searchOpen = signal(false);

  constructor() {
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia(
      '(max-width: 640px), ((max-width: 900px) and (pointer: coarse))',
    );
    const update = () => this.isMobile.set(mq.matches);
    update();
    mq.addEventListener('change', update);
    this.destroyRef.onDestroy(() => mq.removeEventListener('change', update));
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
    if (this.menuOpen()) this.searchOpen.set(false);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  toggleSearch(): void {
    this.searchOpen.update((v) => !v);
    if (this.searchOpen()) this.menuOpen.set(false);
  }

  closeSearch(): void {
    this.searchOpen.set(false);
  }

  closeAll(): void {
    this.menuOpen.set(false);
    this.searchOpen.set(false);
  }
}
