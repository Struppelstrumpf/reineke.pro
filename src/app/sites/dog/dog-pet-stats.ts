import type { DogPetAction } from './dog-pet.types';

export const DOG_PET_TICK_MS = 45_000;
export const DOG_PET_XP_PER_LEVEL = 40;

export type DogStatKey = 'hunger' | 'happiness' | 'cleanliness' | 'energy';

export type DogStatBand = 'critical' | 'low' | 'ok' | 'great';

export const DOG_STAT_META: Record<
  DogStatKey,
  { label: string; icon: string; action: DogPetAction; actionLabel: string }
> = {
  hunger: { label: 'Hunger', icon: '🍖', action: 'feed', actionLabel: 'Füttern' },
  happiness: { label: 'Glück', icon: '💚', action: 'play', actionLabel: 'Spielen' },
  cleanliness: { label: 'Sauber', icon: '✨', action: 'shower', actionLabel: 'Duschen' },
  energy: { label: 'Energie', icon: '⚡', action: 'sleep', actionLabel: 'Schlafen' },
};

export const DOG_ACTION_META: Record<
  DogPetAction,
  { icon: string; label: string; boosts: string[]; shortHint: string }
> = {
  feed: {
    icon: '🍖',
    label: 'Füttern',
    boosts: ['Hunger ↑', 'Glück ↑'],
    shortHint: 'Knochen sammeln — kein Menschenessen!',
  },
  play: {
    icon: '🎾',
    label: 'Spielen',
    boosts: ['Glück ↑', 'Energie ↓'],
    shortHint: 'Zufalls-Spiel — Bälle, Fangen & mehr',
  },
  shower: {
    icon: '🌧️',
    label: 'Duschen',
    boosts: ['Sauber ↑', 'Glück ↑'],
    shortHint: 'Regenwolken jagen, kein Gewitter',
  },
  sleep: {
    icon: '💤',
    label: 'Schlafen',
    boosts: ['Energie ↑'],
    shortHint: 'Schafe zählen, wenn „Mäh“ erscheint',
  },
};

export function statBand(value: number): DogStatBand {
  if (value < 25) return 'critical';
  if (value < 45) return 'low';
  if (value < 75) return 'ok';
  return 'great';
}
