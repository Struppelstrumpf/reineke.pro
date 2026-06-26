export type DogPetState = {
  name: string;
  hunger: number;
  happiness: number;
  cleanliness: number;
  energy: number;
  xp: number;
  level: number;
  lastTickAt: string;
  dockX: number | null;
  dockY: number | null;
};

export const DOG_PET_DEFAULT: DogPetState = {
  name: 'Nasebär',
  hunger: 78,
  happiness: 82,
  cleanliness: 70,
  energy: 65,
  xp: 0,
  level: 1,
  lastTickAt: new Date().toISOString(),
  dockX: null,
  dockY: null,
};

export const DOG_PET_CARD = { width: 380, height: 520 } as const;

export type DogPetRewardDelta = {
  key: string;
  label: string;
  icon: string;
  value: number;
};

export type DogPetLastReward = {
  action: DogPetAction;
  score: number;
  deltas: DogPetRewardDelta[];
  leveledUp: boolean;
  newLevel: number;
};

export type DogPetDockTarget = {
  x: number;
  y: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
};

export type DogPetAction = 'feed' | 'play' | 'shower' | 'sleep';

export type DogAuthProvider = 'email';

export type DogAuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  provider: DogAuthProvider;
};

export type DogCookiePrefs = {
  essential: true;
  functional: boolean;
  statistics: boolean;
  updatedAt: string;
};
