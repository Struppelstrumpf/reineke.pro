import { Injectable, signal } from '@angular/core';
import {
  DEMO_THEME_DEFAULT,
  DEMO_THEME_OPTIONS,
  normalizeDemoThemeId,
  type DemoThemeId,
} from './demo-theme.config';

const DEMO_THEME_KEY = 'pv-demo-theme';

@Injectable({ providedIn: 'root' })
export class DemoThemeService {
  readonly options = DEMO_THEME_OPTIONS;
  readonly activeTheme = signal<DemoThemeId>(DEMO_THEME_DEFAULT);

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }
    const fromStorage = normalizeDemoThemeId(localStorage.getItem(DEMO_THEME_KEY));
    this.setTheme(fromStorage);
  }

  setTheme(themeId: DemoThemeId): void {
    const normalized = normalizeDemoThemeId(themeId);
    this.activeTheme.set(normalized);
    if (typeof window === 'undefined') {
      return;
    }
    document.documentElement.setAttribute('data-demo-theme', normalized);
    localStorage.setItem(DEMO_THEME_KEY, normalized);
  }
}
