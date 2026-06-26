import { Injectable, signal } from '@angular/core';
import { DOG_PET_CARD } from './dog-pet.types';

export type PetDockRect = { x: number; y: number; width: number; height: number };

@Injectable({ providedIn: 'root' })
export class DogPetLauncherService {
  readonly expanded = signal(false);
  readonly animating = signal(false);
  readonly showCloseInLogo = signal(false);
  readonly originRect = signal<DOMRect | null>(null);
  readonly dock = signal<PetDockRect>({
    x: 0,
    y: 0,
    width: DOG_PET_CARD.width,
    height: DOG_PET_CARD.height,
  });

  private returnTimer = 0;

  expand(fromRect: DOMRect): void {
    if (this.animating() || this.expanded()) return;
    this.originRect.set(fromRect);
    this.showCloseInLogo.set(true);
    this.animating.set(true);
    this.expanded.set(true);
    window.setTimeout(() => this.animating.set(false), 940);
  }

  collapse(): void {
    if (this.animating() || !this.expanded()) return;
    this.animating.set(true);
    this.expanded.set(false);
    window.clearTimeout(this.returnTimer);
    this.returnTimer = window.setTimeout(() => {
      this.showCloseInLogo.set(false);
      this.animating.set(false);
    }, 800);
  }

  toggle(fromRect: DOMRect | null): void {
    if (this.expanded()) {
      this.collapse();
    } else if (fromRect) {
      this.expand(fromRect);
    }
  }
}
