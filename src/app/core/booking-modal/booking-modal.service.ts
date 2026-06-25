import { Injectable, signal } from '@angular/core';
import type { StudioPackageId } from '../studio-packages.config';

const DIM_MS = 1500;

@Injectable({ providedIn: 'root' })
export class BookingModalService {
  readonly dimmed = signal(false);
  readonly visible = signal(false);
  readonly preferredPackage = signal<StudioPackageId | null>(null);

  private revealTimer: ReturnType<typeof setTimeout> | null = null;

  open(packageId?: StudioPackageId): void {
    this.clearTimer();
    this.preferredPackage.set(packageId ?? null);
    this.visible.set(false);
    this.dimmed.set(true);
    this.revealTimer = setTimeout(() => this.visible.set(true), DIM_MS);
  }

  close(): void {
    this.clearTimer();
    this.visible.set(false);
    this.preferredPackage.set(null);
    setTimeout(() => this.dimmed.set(false), 280);
  }

  private clearTimer(): void {
    if (this.revealTimer !== null) {
      clearTimeout(this.revealTimer);
      this.revealTimer = null;
    }
  }
}
