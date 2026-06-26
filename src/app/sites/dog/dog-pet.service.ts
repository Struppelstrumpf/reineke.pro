import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { DogAuthService } from './dog-auth.service';
import { DogCookieService } from './dog-cookie.service';
import { DogMobileService } from './dog-mobile.service';
import {
  DOG_PET_TICK_MS,
  DOG_PET_XP_PER_LEVEL,
  DOG_STAT_META,
  statBand,
  type DogStatKey,
} from './dog-pet-stats';
import {
  DOG_PET_CARD,
  DOG_PET_DEFAULT,
  type DogPetAction,
  type DogPetDockTarget,
  type DogPetLastReward,
  type DogPetState,
} from './dog-pet.types';

import type { DogMascotPose } from './dog-mascot.data';

const LOCAL_PET_KEY = 'nasebaer-pet-v1';
const MAX_OFFLINE_TICKS = 48;

function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, n));
}

@Injectable({ providedIn: 'root' })
export class DogPetService {
  private readonly cookies = inject(DogCookieService);
  private readonly auth = inject(DogAuthService);
  private readonly mobile = inject(DogMobileService);

  readonly state = signal<DogPetState>(structuredClone(DOG_PET_DEFAULT));
  readonly lastReward = signal<DogPetLastReward | null>(null);
  readonly tickInSeconds = signal(Math.floor(DOG_PET_TICK_MS / 1000));

  readonly mood = computed(() => {
    const s = this.state();
    const avg = (s.hunger + s.happiness + s.cleanliness + s.energy) / 4;
    if (avg >= 75) return 'happy';
    if (avg >= 45) return 'ok';
    return 'tired';
  });

  readonly moodLabel = computed(() => {
    const m = this.mood();
    if (m === 'happy') return 'Sehr zufrieden';
    if (m === 'ok') return 'Geht so';
    return 'Braucht Zuwendung';
  });

  readonly xpInLevel = computed(() => this.state().xp % DOG_PET_XP_PER_LEVEL);
  readonly xpProgress = computed(() =>
    Math.round((this.xpInLevel() / DOG_PET_XP_PER_LEVEL) * 100),
  );
  readonly xpToNext = computed(() => DOG_PET_XP_PER_LEVEL - this.xpInLevel());

  readonly statRows = computed(() => {
    const s = this.state();
    return (Object.keys(DOG_STAT_META) as DogStatKey[]).map((key) => ({
      key,
      ...DOG_STAT_META[key],
      value: s[key],
      band: statBand(s[key]),
    }));
  });

  readonly careAdvice = computed(() => {
    const rows = [...this.statRows()].sort((a, b) => a.value - b.value);
    const worst = rows[0];
    if (!worst || worst.value >= 52) return null;
    return {
      action: worst.action,
      label: worst.actionLabel,
      statLabel: worst.label,
      value: worst.value,
      icon: worst.icon,
    };
  });

  readonly mascotPose = computed((): DogMascotPose => {
    const s = this.state();
    if (s.energy < 28) return 'sleep';
    if (s.hunger < 25) return 'yawn';
    if (s.happiness > 70 && s.energy > 42 && s.hunger > 35) return 'ball';
    if (s.cleanliness < 30) return 'sit';
    if (s.happiness < 35) return 'sit';
    if (s.energy < 48) return 'yawn';
    if (s.happiness > 55 && s.cleanliness > 50) return 'stand';
    return 'read';
  });

  readonly mascotHint = computed(() => {
    const s = this.state();
    if (s.energy < 28) return 'Müde…';
    if (s.hunger < 25) return 'Hunger!';
    if (s.cleanliness < 30) return 'Baden?';
    if (s.happiness < 35) return 'Trösten?';
    if (s.happiness > 75) return 'Wuff!';
    if (this.mood() === 'ok') return 'Na?';
    return '';
  });

  private tickTimer = 0;
  private saveTimer = 0;
  private countdownTimer = 0;

  constructor() {
    this.loadLocal();
    effect(() => {
      if (this.auth.user()) {
        void this.syncFromServer();
      }
    });
    this.tickTimer = window.setInterval(() => this.tick(), DOG_PET_TICK_MS);
    this.countdownTimer = window.setInterval(() => this.refreshTickCountdown(), 1000);
    this.refreshTickCountdown();
  }

  canPersist(): boolean {
    return this.cookies.hasFunctionalConsent();
  }

  cardDimensions(): { width: number; height: number } {
    const vw = typeof window !== 'undefined' ? window.innerWidth : DOG_PET_CARD.width;
    const vh = typeof window !== 'undefined' ? window.innerHeight : DOG_PET_CARD.height;
    const mobile = this.mobile.isMobile();
    if (mobile) {
      return {
        width: Math.min(vw - 12, 420),
        height: Math.min(vh - 140, 520),
      };
    }
    return {
      width: Math.min(DOG_PET_CARD.width, vw - 24),
      height: Math.min(DOG_PET_CARD.height, vh - 96),
    };
  }

  /** Karte mittig über der Map (unter der Nav). */
  mapCenterTarget(card = this.cardDimensions()): DogPetDockTarget {
    const w = typeof window !== 'undefined' ? window.innerWidth : 400;
    const h = typeof window !== 'undefined' ? window.innerHeight : 800;
    const mobile = this.mobile.isMobile();
    const navPad = mobile ? 48 : 56;
    const bottomPad = mobile ? 72 + 16 : 12;
    const x = Math.round(w / 2 - card.width / 2);
    const availH = h - navPad - bottomPad;
    const y = Math.round(
      Math.min(
        Math.max(navPad + 8, navPad + (availH - card.height) / 2),
        h - card.height - bottomPad,
      ),
    );
    return { x, y, cx: w / 2, cy: y + card.height / 2, width: card.width, height: card.height };
  }

  /** @deprecated Nutze mapCenterTarget — Alias für Abwärtskompatibilität. */
  bottomCenterTarget(card = this.cardDimensions()): DogPetDockTarget {
    return this.mapCenterTarget(card);
  }

  resetDockToMapCenter(): void {
    this.state.update((s) => ({ ...s, dockX: null, dockY: null }));
  }

  resetDockToBottomCenter(): void {
    this.resetDockToMapCenter();
  }

  dockPosition(): { x: number; y: number } {
    const t = this.mapCenterTarget();
    const s = this.state();
    if (s.dockX != null && s.dockY != null) {
      return { x: s.dockX, y: s.dockY };
    }
    return { x: t.x, y: t.y };
  }

  setDock(x: number, y: number): void {
    this.state.update((s) => ({ ...s, dockX: x, dockY: y }));
    this.scheduleSave();
  }

  clearLastReward(): void {
    this.lastReward.set(null);
  }

  /** Mini-Spiel abgeschlossen — score 0–100 skaliert die Wirkung. */
  completeMiniGame(action: DogPetAction, score: number): DogPetLastReward {
    const before = this.state();
    const factor = Math.max(0.35, Math.min(1, score / 100));

    this.state.update((s) => {
      const next = { ...s, lastTickAt: new Date().toISOString() };
      switch (action) {
        case 'feed':
          next.hunger = clamp(next.hunger + Math.round(30 * factor));
          next.happiness = clamp(next.happiness + Math.round(10 * factor));
          next.cleanliness = clamp(next.cleanliness - Math.round(5 * factor));
          next.xp += Math.round(8 * factor);
          break;
        case 'play':
          next.happiness = clamp(next.happiness + Math.round(28 * factor));
          next.energy = clamp(next.energy - Math.round(16 * factor));
          next.hunger = clamp(next.hunger - Math.round(8 * factor));
          next.xp += Math.round(12 * factor);
          break;
        case 'shower':
          next.cleanliness = clamp(next.cleanliness + Math.round(36 * factor));
          next.happiness = clamp(next.happiness + Math.round(8 * factor));
          next.energy = clamp(next.energy - Math.round(5 * factor));
          next.xp += Math.round(7 * factor);
          break;
        case 'sleep':
          next.energy = clamp(next.energy + Math.round(34 * factor));
          next.hunger = clamp(next.hunger - Math.round(6 * factor));
          next.xp += Math.round(6 * factor);
          break;
      }
      next.level = 1 + Math.floor(next.xp / DOG_PET_XP_PER_LEVEL);
      return next;
    });

    const after = this.state();
    const deltas = (Object.keys(DOG_STAT_META) as DogStatKey[])
      .map((key) => ({
        key: key as string,
        label: DOG_STAT_META[key].label,
        icon: DOG_STAT_META[key].icon,
        value: after[key] - before[key],
      }))
      .filter((d) => d.value !== 0);

    const xpGain = after.xp - before.xp;
    if (xpGain) {
      deltas.push({ key: 'xp', label: 'XP', icon: '⭐', value: xpGain });
    }

    const reward: DogPetLastReward = {
      action,
      score,
      deltas,
      leveledUp: after.level > before.level,
      newLevel: after.level,
    };
    this.lastReward.set(reward);
    this.scheduleSave();
    return reward;
  }

  private tick(): void {
    this.state.update((s) => ({
      ...s,
      hunger: clamp(s.hunger - 3),
      happiness: clamp(s.happiness - 2),
      cleanliness: clamp(s.cleanliness - 2),
      energy: clamp(s.energy - 2),
      lastTickAt: new Date().toISOString(),
    }));
    this.refreshTickCountdown();
    this.scheduleSave();
  }

  private refreshTickCountdown(): void {
    const last = new Date(this.state().lastTickAt).getTime();
    const elapsed = Date.now() - last;
    const remaining = Math.max(0, Math.ceil((DOG_PET_TICK_MS - (elapsed % DOG_PET_TICK_MS)) / 1000));
    this.tickInSeconds.set(remaining || Math.floor(DOG_PET_TICK_MS / 1000));
  }

  private applyOfflineTicks(): void {
    const s = this.state();
    const last = new Date(s.lastTickAt).getTime();
    const elapsed = Date.now() - last;
    const ticks = Math.min(MAX_OFFLINE_TICKS, Math.floor(elapsed / DOG_PET_TICK_MS));
    if (ticks <= 0) return;

    this.state.update((cur) => {
      let next = { ...cur };
      for (let i = 0; i < ticks; i++) {
        next = {
          ...next,
          hunger: clamp(next.hunger - 3),
          happiness: clamp(next.happiness - 2),
          cleanliness: clamp(next.cleanliness - 2),
          energy: clamp(next.energy - 2),
        };
      }
      return { ...next, lastTickAt: new Date().toISOString() };
    });
  }

  private scheduleSave(): void {
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => void this.persist(), 400);
  }

  private async persist(): Promise<void> {
    if (!this.canPersist()) return;
    const payload = JSON.stringify(this.state());
    localStorage.setItem(LOCAL_PET_KEY, payload);
    if (this.auth.sessionToken()) {
      await this.auth.savePet(this.state());
    }
  }

  private loadLocal(): void {
    if (!this.cookies.hasFunctionalConsent()) return;
    try {
      const raw = localStorage.getItem(LOCAL_PET_KEY);
      if (!raw) return;
      this.state.set({ ...DOG_PET_DEFAULT, ...(JSON.parse(raw) as DogPetState) });
      this.applyOfflineTicks();
      this.refreshTickCountdown();
    } catch {
      /* ignore */
    }
  }

  reloadAfterConsent(): void {
    this.loadLocal();
    if (this.auth.user()) void this.syncFromServer();
  }

  private async syncFromServer(): Promise<void> {
    const remote = await this.auth.loadPet();
    if (remote) {
      this.state.set({ ...DOG_PET_DEFAULT, ...remote });
      this.applyOfflineTicks();
      this.refreshTickCountdown();
      if (this.canPersist()) {
        localStorage.setItem(LOCAL_PET_KEY, JSON.stringify(this.state()));
      }
    }
  }
}
