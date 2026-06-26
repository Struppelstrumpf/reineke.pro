import { Injectable, inject, signal } from '@angular/core';
import { DogAuthService } from './dog-auth.service';
import type { DogUserPin } from './dog.data';

export type DogPinDraft = {
  emoji: string;
  title: string;
  description: string;
  visibility: 'private' | 'public';
  lat: number;
  lng: number;
  address: string;
};

export type DogMapPickPreview = {
  lat: number;
  lng: number;
};

export const DOG_PIN_EMOJIS = ['📍', '🐕', '🌳', '🌿', '💧', '⚠️', '❤️', '⭐', '🦴', '🎾'] as const;

@Injectable({ providedIn: 'root' })
export class DogPinsService {
  private readonly auth = inject(DogAuthService);

  readonly sheetOpen = signal(false);
  readonly mapPickActive = signal(false);
  readonly mapPickPreview = signal<DogMapPickPreview | null>(null);
  readonly pickLat = signal<number | null>(null);
  readonly pickLng = signal<number | null>(null);

  /** @deprecated use mapPickActive */
  readonly pickingOnMap = this.mapPickActive;

  setMapPickPreview(lat: number, lng: number): void {
    this.mapPickPreview.set({ lat, lng });
  }

  confirmMapPick(): void {
    const preview = this.mapPickPreview();
    if (!preview) return;
    this.pickLat.set(preview.lat);
    this.pickLng.set(preview.lng);
    this.resetMapPick(false);
    this.sheetOpen.set(true);
  }

  rejectMapPick(): void {
    this.mapPickPreview.set(null);
  }

  cancelMapPick(): void {
    this.resetMapPick(true);
    this.sheetOpen.set(true);
  }

  startMapPick(): void {
    this.resetMapPick(true);
    this.mapPickActive.set(true);
    this.sheetOpen.set(false);
  }

  private resetMapPick(clearCoords: boolean): void {
    this.mapPickActive.set(false);
    this.mapPickPreview.set(null);
    if (clearCoords) {
      this.pickLat.set(null);
      this.pickLng.set(null);
    }
  }

  private headers(): Record<string, string> {
    const token = this.auth.sessionToken();
    if (!token) throw new Error('Nicht angemeldet');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  async loadNearby(lat: number, lng: number, radiusKm: number): Promise<DogUserPin[]> {
    const token = this.auth.sessionToken();
    if (!token) return [];
    try {
      const res = await fetch(
        `/api/pins?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return [];
      const data = (await res.json()) as { pins?: DogUserPin[] };
      return data.pins ?? [];
    } catch {
      return [];
    }
  }

  async create(draft: DogPinDraft): Promise<DogUserPin | null> {
    const res = await fetch('/api/pins', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(draft),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { pin?: DogUserPin };
    return data.pin ?? null;
  }

  async remove(id: string): Promise<boolean> {
    const res = await fetch(`/api/pins/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    return res.ok;
  }

  openSheet(): void {
    this.resetMapPick(true);
    this.sheetOpen.set(true);
  }

  closeSheet(): void {
    this.resetMapPick(true);
    this.sheetOpen.set(false);
  }
}
