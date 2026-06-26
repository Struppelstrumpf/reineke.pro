import { Injectable, computed, inject, signal } from '@angular/core';
import { dogDistanceKm } from './dog.data';
import { DogExploreService } from './dog-explore.service';
import { DOG_ACTION_META } from './dog-pet-stats';
import { DogPetService } from './dog-pet.service';
import type { DogPetAction } from './dog-pet.types';

export type MapGameEntityKind =
  | 'bone'
  | 'pizza'
  | 'burger'
  | 'hotdog'
  | 'donut'
  | 'ball'
  | 'mailbox'
  | 'splash'
  | 'playdog'
  | 'rain-cloud'
  | 'storm-cloud'
  | 'sheep'
  | 'wolf'
  | 'cat'
  | 'trash';

export type DogMapDogFx = 'shock' | 'steamed' | 'dizzy' | 'sad' | null;

export type PlayVariant = 'ball' | 'mailbox' | 'splash' | 'catch';

export type MapGameEntity = {
  id: string;
  kind: MapGameEntityKind;
  lat: number;
  lng: number;
  collected: boolean;
  visible: boolean;
  clickable: boolean;
  bubble: string | null;
  size: 'md' | 'lg';
  velLat?: number;
  velLng?: number;
  phaseUntil?: number;
  visibleMs?: number;
  hiddenMs?: number;
};

const GAME_DURATION_MS = 60_000;
const ARRIVE_KM = 0.045;
const GAME_ZOOM = 17;

const PLAY_VARIANTS: PlayVariant[] = ['ball', 'mailbox', 'splash', 'catch'];

const GAME_COPY: Record<DogPetAction, { done: string }> = {
  feed: { done: 'Lecker! Satt und zufrieden.' },
  play: { done: 'Super gespielt — wedeln level up!' },
  shower: { done: 'Blitzblank und frisch.' },
  sleep: { done: 'Ausgeruht und fit.' },
};

const HUMAN_FOOD_KINDS: MapGameEntityKind[] = ['pizza', 'burger', 'hotdog', 'donut'];

const HUMAN_FOOD_MSG = [
  'Das ist nur für Menschen! Dein Nasebär braucht Hundefutter!',
  'Nee nee — das isst kein Hund!',
  'Lieber einen Knochen, oder?',
  'Menschliches Essen? Pfui — wo ist das Hundefutter?',
];

const TRAP_MSG: Partial<Record<MapGameEntityKind, string[]>> = {
  wolf: ['Das ist ein Wolf — kein Schaf!', 'Grrr! Falsches Tier zum Zählen.'],
  cat: ['Das ist eine Katze — kein Spielball!', 'Miau — Hunde jagen Bälle, keine Katzen!'],
  trash: ['Leerer Kasten — kein Spiel!', 'Da ist nichts drin …'],
};

function isBadKind(kind: MapGameEntityKind): boolean {
  return (
    kind === 'storm-cloud' ||
    kind === 'wolf' ||
    kind === 'cat' ||
    kind === 'trash' ||
    HUMAN_FOOD_KINDS.includes(kind)
  );
}

function pickRandom(items: string[]): string {
  return items[Math.floor(Math.random() * items.length)]!;
}
const COLLECT_MSG: Partial<Record<MapGameEntityKind, string>> = {
  bone: '🦴 Lecker!',
  pizza: '',
  burger: '',
  hotdog: '',
  donut: '',
  ball: '🎾 Gotcha!',
  mailbox: '📮 Abgeholt!',
  splash: '💦 Platsch!',
  'rain-cloud': '🌧️ Nass und frisch!',
  sheep: '🐑 Mäh — gezählt!',
  playdog: '🐕 Wuff — erwischt!',
};

const PLAY_COPY: Record<PlayVariant, { title: string; hint: string }> = {
  ball: { title: 'Bälle jagen', hint: 'Tippe jeden Ball — er rollt nicht von allein.' },
  mailbox: { title: 'Briefkästen jagen', hint: 'Lauf von Briefkasten zu Briefkasten.' },
  splash: { title: 'Planschen', hint: 'Finde das blaue Gewässer und spring rein.' },
  catch: { title: 'Fangen', hint: 'Nur tippen, wenn „Wuff!“ sichtbar ist — 1 Sekunde!' },
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function offsetMeters(
  lat: number,
  lng: number,
  minM: number,
  maxM: number,
): { lat: number; lng: number } {
  const angle = Math.random() * Math.PI * 2;
  const dist = minM + Math.random() * (maxM - minM);
  const dLat = (dist / 111_320) * Math.cos(angle);
  const dLng = (dist / (111_320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
  return { lat: lat + dLat, lng: lng + dLng };
}

@Injectable({ providedIn: 'root' })
export class DogPetMapGameService {
  private readonly explore = inject(DogExploreService);
  private readonly pet = inject(DogPetService);

  readonly active = signal<DogPetAction | null>(null);
  readonly playVariant = signal<PlayVariant | null>(null);
  readonly entities = signal<MapGameEntity[]>([]);
  readonly moving = signal(false);
  readonly progress = signal(0);
  readonly hint = signal('');
  readonly title = signal('');
  readonly flash = signal<string | null>(null);
  readonly goal = signal(0);
  readonly scoreCount = signal(0);
  readonly statusMessage = signal('');
  readonly streak = signal(0);
  readonly secondsLeft = signal(60);
  readonly dogFx = signal<DogMapDogFx>(null);

  readonly playing = computed(() => this.active() !== null);
  readonly gameZoom = GAME_ZOOM;

  readonly stats = computed(() => ({
    done: this.scoreCount(),
    goal: this.goal(),
  }));

  readonly actionIcon = computed(() => {
    const action = this.active();
    return action ? DOG_ACTION_META[action].icon : '';
  });

  readonly boostPreview = computed(() => {
    const action = this.active();
    return action ? DOG_ACTION_META[action].boosts : [];
  });

  private endTimer = 0;
  private phaseTimer = 0;
  private cloudTimer = 0;
  private flashTimer = 0;
  private countdownTimer = 0;
  private statusTimer = 0;
  private startedAt = 0;
  private runToken = 0;

  start(action: DogPetAction): void {
    if (this.active()) this.cancel();
    this.runToken += 1;
    this.active.set(action);
    this.scoreCount.set(0);
    this.progress.set(0);
    this.moving.set(false);
    this.flash.set(null);
    this.statusMessage.set('');
    this.streak.set(0);
    this.startedAt = Date.now();
    this.secondsLeft.set(Math.ceil(GAME_DURATION_MS / 1000));
    this.playVariant.set(action === 'play' ? this.pickPlayVariant() : null);

    const center = this.explore.center();
    const { entities, goal, title, hint } = this.buildGame(action, center);
    this.entities.set(entities);
    this.goal.set(goal);
    this.title.set(title);
    this.hint.set(hint);
    this.pulseStatus(`Los geht's — ${hint}`);

    this.endTimer = window.setTimeout(() => this.finish(false), GAME_DURATION_MS);
    this.countdownTimer = window.setInterval(() => this.tickCountdown(), 250);

    const needsPhases = entities.some((e) => e.kind === 'sheep' || e.kind === 'playdog');
    if (needsPhases) {
      this.phaseTimer = window.setInterval(() => this.tickPhases(), 200);
    }

    if (action === 'shower') {
      this.cloudTimer = window.setInterval(() => this.tickClouds(), 850);
    }
  }

  cancel(): void {
    this.cleanup();
    this.active.set(null);
    this.playVariant.set(null);
    this.entities.set([]);
    this.hint.set('');
    this.title.set('');
    this.progress.set(0);
    this.goal.set(0);
    this.scoreCount.set(0);
    this.moving.set(false);
    this.statusMessage.set('');
    this.streak.set(0);
    this.dogFx.set(null);
    this.secondsLeft.set(0);
  }

  async collectEntity(id: string): Promise<void> {
    if (!this.active() || this.moving() || this.dogFx()) return;
    const entity = this.entities().find((e) => e.id === id);
    if (!entity || entity.collected || !entity.visible) return;

    const token = this.runToken;
    const isTimedTap = entity.kind === 'sheep' || entity.kind === 'playdog';
    const timedValid = isTimedTap && entity.visible && !!entity.bubble && entity.clickable;

    if (isBadKind(entity.kind)) {
      this.moving.set(true);
      await this.runTo(entity.lat, entity.lng);
      if (token !== this.runToken || !this.active()) {
        this.moving.set(false);
        return;
      }
      this.moving.set(false);
      await this.handleBadEntity(entity);
      return;
    }

    if (!entity.clickable) return;

    if (isTimedTap && !timedValid) {
      this.onMiss(entity.kind);
      return;
    }

    this.moving.set(true);
    await this.runTo(entity.lat, entity.lng);
    if (token !== this.runToken || !this.active()) {
      this.moving.set(false);
      return;
    }
    this.moving.set(false);

    if (isTimedTap) {
      if (!timedValid) {
        this.onMiss(entity.kind);
        return;
      }
      this.registerTimedTap(entity);
      return;
    }

    this.entities.update((list) =>
      list.map((e) => (e.id === id ? { ...e, collected: true } : e)),
    );
    this.bumpScore(1, entity.kind);

    if (this.scoreCount() >= this.goal()) {
      window.setTimeout(() => this.finish(true), 350);
    }
  }

  private async handleBadEntity(entity: MapGameEntity): Promise<void> {
    if (entity.kind === 'storm-cloud') {
      await this.playStormShock();
      this.applyPenalty('⛈️ Autsch! Gewitterwolken sind tabu!');
      return;
    }

    if (HUMAN_FOOD_KINDS.includes(entity.kind)) {
      await this.playDogFx('dizzy', 900);
      this.entities.update((list) =>
        list.map((e) => (e.id === entity.id ? { ...e, collected: true } : e)),
      );
      this.applyPenalty(pickRandom(HUMAN_FOOD_MSG));
      return;
    }

    const msgs = TRAP_MSG[entity.kind];
    const fx = entity.kind === 'wolf' ? 'sad' : 'dizzy';
    await this.playDogFx(fx, entity.kind === 'wolf' ? 1100 : 900);
    this.entities.update((list) =>
      list.map((e) => (e.id === entity.id ? { ...e, collected: true } : e)),
    );
    this.applyPenalty(msgs ? pickRandom(msgs) : 'Ups — das war falsch!');
  }

  private async playStormShock(): Promise<void> {
    this.dogFx.set('shock');
    await sleep(380);
    this.dogFx.set('steamed');
    await sleep(2000);
    this.dogFx.set(null);
  }

  private async playDogFx(fx: Exclude<DogMapDogFx, null>, ms: number): Promise<void> {
    this.dogFx.set(fx);
    await sleep(ms);
    if (this.dogFx() === fx) this.dogFx.set(null);
  }

  private applyPenalty(message: string): void {
    this.streak.set(0);
    this.scoreCount.update((v) => Math.max(0, v - 1));
    const g = this.goal();
    this.progress.set(g ? Math.round((this.scoreCount() / g) * 100) : 0);
    this.pulseStatus(message);
  }

  private pickPlayVariant(): PlayVariant {
    return PLAY_VARIANTS[Math.floor(Math.random() * PLAY_VARIANTS.length)];
  }

  private buildGame(
    action: DogPetAction,
    center: { lat: number; lng: number },
  ): { entities: MapGameEntity[]; goal: number; title: string; hint: string } {
    switch (action) {
      case 'feed': {
        const bones = Array.from({ length: 6 }, (_, i) => {
          const p = offsetMeters(center.lat, center.lng, 60, 200);
          return this.staticEntity(`bone-${i}`, 'bone', p);
        });
        const decoys = (['pizza', 'burger', 'hotdog', 'donut'] as const).map((kind, i) => {
          const p = offsetMeters(center.lat, center.lng, 55, 210);
          return this.staticEntity(`${kind}-${i}`, kind, p);
        });
        return {
          entities: [...bones, ...decoys],
          goal: 6,
          title: 'Lecker fangen',
          hint: 'Nur Knochen 🦴 — kein Menschenessen!',
        };
      }
      case 'play':
        return this.buildPlayGame(center);
      case 'shower':
        return this.buildShowerGame(center);
      case 'sleep':
        return this.buildSleepGame(center);
    }
  }

  private buildPlayGame(center: { lat: number; lng: number }) {
    const variant = this.playVariant()!;
    const copy = PLAY_COPY[variant];

    switch (variant) {
      case 'ball': {
        const balls = Array.from({ length: 5 }, (_, i) => {
          const p = offsetMeters(center.lat, center.lng, 70, 220);
          return this.staticEntity(`ball-${i}`, 'ball', p);
        });
        const cats = Array.from({ length: 2 }, (_, i) => {
          const p = offsetMeters(center.lat, center.lng, 65, 200);
          return this.staticEntity(`cat-${i}`, 'cat', p);
        });
        return {
          entities: [...balls, ...cats],
          goal: 5,
          title: copy.title,
          hint: 'Nur Bälle 🎾 — Katzen meiden!',
        };
      }
      case 'mailbox': {
        const boxes = Array.from({ length: 4 }, (_, i) => {
          const p = offsetMeters(center.lat, center.lng, 80, 240);
          return this.staticEntity(`mail-${i}`, 'mailbox', p);
        });
        const trash = Array.from({ length: 2 }, (_, i) => {
          const p = offsetMeters(center.lat, center.lng, 75, 220);
          return this.staticEntity(`trash-${i}`, 'trash', p);
        });
        return {
          entities: [...boxes, ...trash],
          goal: 4,
          title: copy.title,
          hint: 'Echte Briefkästen 📮 — kein Müll!',
        };
      }
      case 'splash': {
        const water = this.explore.filteredSpots().find((s) => s.kind === 'hundestrand');
        const p = water
          ? { lat: water.lat, lng: water.lng }
          : offsetMeters(center.lat, center.lng, 120, 280);
        return {
          entities: [this.staticEntity('splash-0', 'splash', p, 'lg')],
          goal: 1,
          title: copy.title,
          hint: copy.hint,
        };
      }
      case 'catch': {
        const p = offsetMeters(center.lat, center.lng, 90, 180);
        const now = Date.now();
        return {
          entities: [
            {
              id: 'playdog-0',
              kind: 'playdog' as const,
              lat: p.lat,
              lng: p.lng,
              collected: false,
              visible: true,
              clickable: true,
              bubble: 'Wuff!',
              size: 'lg' as const,
              visibleMs: 2200,
              hiddenMs: 2800,
              phaseUntil: now + 2200,
            },
          ],
          goal: 6,
          title: copy.title,
          hint: copy.hint,
        };
      }
    }
  }

  private buildShowerGame(center: { lat: number; lng: number }) {
    const rain = Array.from({ length: 4 }, (_, i) => {
      const p = offsetMeters(center.lat, center.lng, 90, 220);
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.000022 + Math.random() * 0.000014;
      return {
        id: `rain-${i}`,
        kind: 'rain-cloud' as const,
        ...p,
        collected: false,
        visible: true,
        clickable: true,
        bubble: null,
        size: 'lg' as const,
        velLat: Math.cos(angle) * speed,
        velLng: Math.sin(angle) * speed,
      };
    });
    const storm = Array.from({ length: 3 }, (_, i) => {
      const p = offsetMeters(center.lat, center.lng, 100, 250);
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.000018 + Math.random() * 0.000012;
      return {
        id: `storm-${i}`,
        kind: 'storm-cloud' as const,
        ...p,
        collected: false,
        visible: true,
        clickable: true,
        bubble: null,
        size: 'lg' as const,
        velLat: Math.cos(angle) * speed,
        velLng: Math.sin(angle) * speed,
      };
    });
    return {
      entities: [...rain, ...storm],
      goal: 4,
      title: 'Regenwolken',
      hint: 'Regenwolken 🌧️ jagen — Gewitter ⛈️ meiden!',
    };
  }

  private buildSleepGame(center: { lat: number; lng: number }) {
    const now = Date.now();
    const sheep = Array.from({ length: 4 }, (_, i) => {
      const p = offsetMeters(center.lat, center.lng, 70, 200);
      const startVisible = Math.random() > 0.45;
      const stagger = i * 750 + Math.random() * 600;
      return {
        id: `sheep-${i}`,
        kind: 'sheep' as const,
        ...p,
        collected: false,
        visible: startVisible,
        clickable: startVisible,
        bubble: startVisible ? 'Mäh' : null,
        size: 'md' as const,
        visibleMs: 2200,
        hiddenMs: 2800,
        phaseUntil: startVisible ? now + 2200 : now + stagger,
      };
    });
    const wolves = Array.from({ length: 2 }, (_, i) => {
      const p = offsetMeters(center.lat, center.lng, 80, 190);
      return this.staticEntity(`wolf-${i}`, 'wolf', p);
    });
    return {
      entities: [...sheep, ...wolves],
      goal: 10,
      title: 'Schafe zählen',
      hint: 'Nur Schafe 🐑 mit „Mäh“ — Wölfe meiden!',
    };
  }

  private staticEntity(
    id: string,
    kind: MapGameEntityKind,
    pos: { lat: number; lng: number },
    size: 'md' | 'lg' = 'md',
  ): MapGameEntity {
    return {
      id,
      kind,
      lat: pos.lat,
      lng: pos.lng,
      collected: false,
      visible: true,
      clickable: true,
      bubble: null,
      size,
    };
  }

  private registerTimedTap(entity: MapGameEntity): void {
    const now = Date.now();
    this.bumpScore(1, entity.kind);

    if (entity.kind === 'sheep') {
      const p = offsetMeters(entity.lat, entity.lng, 50, 140);
      this.entities.update((list) =>
        list.map((e) =>
          e.id === entity.id
            ? {
                ...e,
                ...p,
                visible: false,
                clickable: false,
                bubble: null,
                phaseUntil: now + (e.hiddenMs ?? 3000),
              }
            : e,
        ),
      );
    } else if (entity.kind === 'playdog') {
      this.entities.update((list) =>
        list.map((e) =>
          e.id === entity.id
            ? {
                ...e,
                visible: false,
                clickable: false,
                bubble: null,
                phaseUntil: now + (e.hiddenMs ?? 3000),
              }
            : e,
        ),
      );
    }

    if (this.scoreCount() >= this.goal()) {
      window.setTimeout(() => this.finish(true), 350);
    }
  }

  private bumpScore(n: number, kind?: MapGameEntityKind): void {
    const nextStreak = this.streak() + 1;
    this.streak.set(nextStreak);
    this.scoreCount.update((v) => v + n);
    const g = this.goal();
    this.progress.set(g ? Math.round((this.scoreCount() / g) * 100) : 0);

    if (kind && COLLECT_MSG[kind]) {
      this.pulseStatus(COLLECT_MSG[kind]!);
    }
    if (nextStreak >= 3 && nextStreak % 3 === 0) {
      window.setTimeout(
        () => this.pulseStatus(`🔥 Combo ×${nextStreak}! Weiter so!`),
        120,
      );
    }
  }

  private onMiss(kind: MapGameEntityKind): void {
    this.streak.set(0);
    const msg =
      kind === 'sheep'
        ? '🐑 Zu spät — Schaf schläft schon.'
        : '🐕 Wuff ist weg — warte auf das nächste Mal!';
    this.pulseStatus(msg);
    void this.playDogFx('sad', 700);
  }

  private pulseStatus(message: string): void {
    this.statusMessage.set(message);
    window.clearTimeout(this.statusTimer);
    this.statusTimer = window.setTimeout(() => this.statusMessage.set(''), 2200);
  }

  private tickCountdown(): void {
    if (!this.active()) return;
    const left = Math.max(0, Math.ceil((this.startedAt + GAME_DURATION_MS - Date.now()) / 1000));
    this.secondsLeft.set(left);
  }

  private tickPhases(): void {
    if (this.moving() || this.dogFx()) return;
    const now = Date.now();
    const center = this.explore.center();
    let changed = false;

    const next = this.entities().map((e) => {
      if (!e.visibleMs || !e.hiddenMs || e.collected) return e;
      if (e.kind !== 'sheep' && e.kind !== 'playdog') return e;
      if (!e.phaseUntil || now < e.phaseUntil) return e;

      changed = true;
      if (e.visible) {
        return {
          ...e,
          visible: false,
          clickable: false,
          bubble: null,
          phaseUntil: now + e.hiddenMs,
        };
      }

      const anchor = e.kind === 'sheep' ? { lat: e.lat, lng: e.lng } : center;
      const p = offsetMeters(anchor.lat, anchor.lng, 45, 130);
      const bubble = e.kind === 'sheep' ? 'Mäh' : 'Wuff!';
      return {
        ...e,
        ...p,
        visible: true,
        clickable: true,
        bubble,
        phaseUntil: now + e.visibleMs,
      };
    });

    if (changed) this.entities.set(next);
  }

  private tickClouds(): void {
    const center = this.explore.center();
    let changed = false;

    const next = this.entities().map((e) => {
      if ((e.kind !== 'rain-cloud' && e.kind !== 'storm-cloud') || e.collected) return e;
      if (e.velLat == null || e.velLng == null) return e;
      let lat = e.lat + e.velLat;
      let lng = e.lng + e.velLng;
      if (dogDistanceKm(center.lat, center.lng, lat, lng) > 0.35) {
        const p = offsetMeters(center.lat, center.lng, 80, 180);
        lat = p.lat;
        lng = p.lng;
      }
      if (Math.abs(lat - e.lat) < 1e-8 && Math.abs(lng - e.lng) < 1e-8) return e;
      changed = true;
      return { ...e, lat, lng };
    });

    if (changed) this.entities.set(next);
  }

  private async runTo(targetLat: number, targetLng: number): Promise<void> {
    const start = { ...this.explore.center() };
    const steps = 24;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const ease = 1 - (1 - t) ** 3;
      this.explore.center.set({
        lat: start.lat + (targetLat - start.lat) * ease,
        lng: start.lng + (targetLng - start.lng) * ease,
      });
      await sleep(20);
    }
    const dist = dogDistanceKm(
      this.explore.center().lat,
      this.explore.center().lng,
      targetLat,
      targetLng,
    );
    if (dist > ARRIVE_KM) {
      this.explore.setCenter({ lat: targetLat, lng: targetLng });
    } else {
      this.explore.persistCenter();
    }
  }

  private finish(allCollected: boolean): void {
    const action = this.active();
    if (!action) return;

    const done = this.scoreCount();
    const g = this.goal();
    const ratio = g ? done / g : 0;
    const timeBonus = allCollected ? 18 : 0;
    const streakBonus = Math.min(12, this.streak() * 2);
    const score = Math.round(Math.min(100, ratio * 72 + timeBonus + streakBonus + done * 3));

    const reward = this.pet.completeMiniGame(action, score);
    this.cleanup();
    this.active.set(null);
    this.playVariant.set(null);
    this.entities.set([]);
    this.progress.set(100);
    this.flash.set(this.formatFinishFlash(action, allCollected, score, reward));
    this.flashTimer = window.setTimeout(() => this.flash.set(null), 3200);
  }

  private formatFinishFlash(
    action: DogPetAction,
    allCollected: boolean,
    score: number,
    reward: ReturnType<DogPetService['completeMiniGame']>,
  ): string {
    const parts = [GAME_COPY[action].done];
    if (allCollected) parts.push('Alles geschafft!');
    if (reward.leveledUp) parts.push(`Level ${reward.newLevel}! 🎉`);
    const deltaText = reward.deltas
      .slice(0, 4)
      .map((d) => `${d.icon} ${d.value > 0 ? '+' : ''}${d.value}`)
      .join(' · ');
    if (deltaText) parts.push(deltaText);
    parts.push(`${score}%`);
    return parts.join(' — ');
  }

  private cleanup(): void {
    this.runToken += 1;
    window.clearTimeout(this.endTimer);
    window.clearInterval(this.phaseTimer);
    window.clearInterval(this.cloudTimer);
    window.clearInterval(this.countdownTimer);
    window.clearTimeout(this.statusTimer);
    this.endTimer = 0;
    this.phaseTimer = 0;
    this.cloudTimer = 0;
    this.countdownTimer = 0;
    this.moving.set(false);
    this.dogFx.set(null);
  }
}

export function mapGameEntityEmoji(kind: MapGameEntityKind): string {
  switch (kind) {
    case 'bone':
      return '🦴';
    case 'pizza':
      return '🍕';
    case 'burger':
      return '🍔';
    case 'hotdog':
      return '🌭';
    case 'donut':
      return '🍩';
    case 'ball':
      return '🎾';
    case 'mailbox':
      return '📮';
    case 'splash':
      return '💦';
    case 'playdog':
      return '🐕';
    case 'rain-cloud':
      return '🌧️';
    case 'storm-cloud':
      return '⛈️';
    case 'sheep':
      return '🐑';
    case 'wolf':
      return '🐺';
    case 'cat':
      return '🐈';
    case 'trash':
      return '🗑️';
  }
}

export function mapGameEntityLabel(kind: MapGameEntityKind): string {
  switch (kind) {
    case 'bone':
      return 'Knochen';
    case 'pizza':
      return 'Pizza';
    case 'burger':
      return 'Burger';
    case 'hotdog':
      return 'Hotdog';
    case 'donut':
      return 'Donut';
    case 'ball':
      return 'Ball';
    case 'mailbox':
      return 'Briefkasten';
    case 'splash':
      return 'Gewässer';
    case 'playdog':
      return 'Nasebär';
    case 'rain-cloud':
      return 'Regenwolke';
    case 'storm-cloud':
      return 'Gewitterwolke';
    case 'sheep':
      return 'Schaf';
    case 'wolf':
      return 'Wolf';
    case 'cat':
      return 'Katze';
    case 'trash':
      return 'Mülltonne';
  }
}

export function gameMarkerHtml(entity: MapGameEntity): string {
  const emoji = mapGameEntityEmoji(entity.kind);
  const label = mapGameEntityLabel(entity.kind);
  const size = entity.size === 'lg' ? ' dog-map__game-pin--lg' : '';
  const storm = entity.kind === 'storm-cloud' ? ' dog-map__game-pin--storm' : '';
  const rain = entity.kind === 'rain-cloud' ? ' dog-map__game-pin--rain' : '';
  const bad = isBadKind(entity.kind) && entity.kind !== 'storm-cloud' ? ' dog-map__game-pin--bad' : '';
  const bubble = entity.bubble
    ? `<span class="dog-map__game-bubble">${entity.bubble}</span>`
    : '';
  return `<button type="button" class="dog-map__game-pin${size}${storm}${rain}${bad}" aria-label="${label}" ${entity.clickable ? '' : 'disabled'}>
    ${bubble}
    <span class="dog-map__game-pin-glow"></span>
    <span class="dog-map__game-pin-ico">${emoji}</span>
  </button>`;
}
