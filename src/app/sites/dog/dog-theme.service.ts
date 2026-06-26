import { Injectable, computed, effect, signal } from '@angular/core';
import { DOG_STATE_KEY, DOG_STATE_KEY_LEGACY, type DogExploreFilters } from './dog.data';

export type DogThemeMode = 'light' | 'dark';

type DogPersistedState = {
  theme: DogThemeMode;
  filters?: unknown;
  center?: { lat: number; lng: number };
  favorites?: string[];
  hiddenAlertIds?: string[];
};

@Injectable({ providedIn: 'root' })
export class DogThemeService {
  readonly mode = signal<DogThemeMode>(this.loadTheme());

  readonly isDark = computed(() => this.mode() === 'dark');

  constructor() {
    effect(() => {
      const mode = this.mode();
      document.documentElement.setAttribute('data-dog-theme', mode);
      this.patchState({ theme: mode });
    });
  }

  toggle(): void {
    this.mode.update((m) => (m === 'light' ? 'dark' : 'light'));
  }

  setMode(mode: DogThemeMode): void {
    this.mode.set(mode);
  }

  readState(): DogPersistedState {
    try {
      let raw = localStorage.getItem(DOG_STATE_KEY);
      if (!raw) {
        for (const key of DOG_STATE_KEY_LEGACY) {
          raw = localStorage.getItem(key);
          if (raw) break;
        }
      }
      if (!raw) return { theme: 'light' };
      return JSON.parse(raw) as DogPersistedState;
    } catch {
      return { theme: 'light' };
    }
  }

  patchState(patch: Partial<DogPersistedState>): void {
    const next = { ...this.readState(), ...patch };
    localStorage.setItem(DOG_STATE_KEY, JSON.stringify(next));
  }

  private loadTheme(): DogThemeMode {
    const stored = this.readState().theme;
    return stored === 'dark' ? 'dark' : 'light';
  }
}
