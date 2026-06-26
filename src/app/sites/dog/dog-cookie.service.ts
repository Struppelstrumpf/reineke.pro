import { Injectable, signal } from '@angular/core';
import type { DogCookiePrefs } from './dog-pet.types';

export const DOG_COOKIE_PREFS_KEY = 'nasebaer-cookie-prefs-v1';
export const DOG_MAP_CENTER_KEY = 'nasebaer-map-center-v1';

export type DogMapCenter = { lat: number; lng: number; updatedAt: string };

@Injectable({ providedIn: 'root' })
export class DogCookieService {
  readonly bannerOpen = signal(false);
  readonly settingsOpen = signal(false);
  readonly functional = signal(false);
  readonly statistics = signal(false);

  readonly hasFunctionalConsent = signal(false);

  constructor() {
    const stored = this.read();
    if (!stored) {
      this.bannerOpen.set(true);
      return;
    }
    this.functional.set(stored.functional);
    this.statistics.set(stored.statistics);
    this.hasFunctionalConsent.set(stored.functional);
  }

  acceptAll(): void {
    this.save({ essential: true, functional: true, statistics: true });
    this.bannerOpen.set(false);
    this.settingsOpen.set(false);
  }

  rejectOptional(): void {
    this.save({ essential: true, functional: false, statistics: false });
    this.clearMapCenter();
    this.bannerOpen.set(false);
    this.settingsOpen.set(false);
  }

  saveSelection(): void {
    this.save({
      essential: true,
      functional: this.functional(),
      statistics: this.statistics(),
    });
    this.bannerOpen.set(false);
    this.settingsOpen.set(false);
  }

  openSettings(): void {
    const stored = this.read();
    if (stored) {
      this.functional.set(stored.functional);
      this.statistics.set(stored.statistics);
    }
    this.settingsOpen.set(true);
    this.bannerOpen.set(true);
  }

  saveMapCenter(lat: number, lng: number): void {
    if (!this.hasFunctionalConsent()) return;
    if (!this.isValidCoord(lat, lng)) return;
    const payload: DogMapCenter = { lat, lng, updatedAt: new Date().toISOString() };
    localStorage.setItem(DOG_MAP_CENTER_KEY, JSON.stringify(payload));
  }

  loadMapCenter(): DogMapCenter | null {
    if (!this.hasFunctionalConsent()) return null;
    try {
      const raw = localStorage.getItem(DOG_MAP_CENTER_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as DogMapCenter;
      if (!this.isValidCoord(parsed.lat, parsed.lng)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  clearMapCenter(): void {
    localStorage.removeItem(DOG_MAP_CENTER_KEY);
  }

  private isValidCoord(lat: number, lng: number): boolean {
    return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  private save(partial: Omit<DogCookiePrefs, 'updatedAt'>): void {
    const prefs: DogCookiePrefs = { ...partial, updatedAt: new Date().toISOString() };
    localStorage.setItem(DOG_COOKIE_PREFS_KEY, JSON.stringify(prefs));
    this.functional.set(prefs.functional);
    this.statistics.set(prefs.statistics);
    this.hasFunctionalConsent.set(prefs.functional);
    if (!prefs.functional) {
      this.clearMapCenter();
    }
  }

  private read(): DogCookiePrefs | null {
    try {
      const raw = localStorage.getItem(DOG_COOKIE_PREFS_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as DogCookiePrefs;
    } catch {
      return null;
    }
  }
}
