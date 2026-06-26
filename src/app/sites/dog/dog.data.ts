export type DogSpotKind =
  | 'wald'
  | 'wiese'
  | 'hundewiese'
  | 'hundestrand'
  | 'park'
  | 'spazierweg';

export type DogAlertKind = 'giftkoeder' | 'nachbar' | 'leine' | 'brutzeit' | 'hinweis';

export type DogSpot = {
  id: string;
  kind: DogSpotKind;
  name: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  rating: number;
  tipCount: number;
  leash: 'frei' | 'teilweise' | 'pflicht';
  snippet: string;
  description?: string;
  imageUrl?: string;
  imageSource?: 'osm' | 'wikidata' | 'wikipedia';
  source: 'community' | 'osm' | 'meldung' | 'wikidata' | 'wikipedia';
  osmUrl?: string;
  wikipediaUrl?: string;
  wikidataId?: string;
  wikipediaTag?: string;
  isUserPin?: boolean;
  pinEmoji?: string;
  pinVisibility?: 'private' | 'public';
  pinUserId?: string;
};

export type DogUserPin = {
  id: string;
  userId: string;
  userName: string;
  visibility: 'private' | 'public';
  emoji: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  address?: string;
  createdAt: string;
};

export type DogAlert = {
  id: string;
  kind: DogAlertKind;
  title: string;
  detail: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  ago: string;
  severity: 'info' | 'warn' | 'danger';
  source: string;
  sourceUrl?: string;
  imageUrl?: string;
};

export type DogMapPopupTarget =
  | { type: 'spot'; id: string }
  | { type: 'alert'; id: string };

export type DogTip = {
  id: string;
  spotId: string;
  author: string;
  text: string;
  ago: string;
};

export type DogExploreFilters = {
  radiusKm: number;
  kinds: Record<DogSpotKind, boolean>;
  ownPins: boolean;
  otherUserPins: boolean;
};

export const DOG_SPOT_LABELS: Record<DogSpotKind, string> = {
  wald: 'Wald',
  wiese: 'Wiese',
  hundewiese: 'Hundewiese',
  hundestrand: 'Hundestrand',
  park: 'Park',
  spazierweg: 'Spazierweg',
};

export const DOG_SPOT_EMOJI: Record<DogSpotKind, string> = {
  wald: '🌲',
  wiese: '🌿',
  hundewiese: '🐕',
  hundestrand: '🏖️',
  park: '🌳',
  spazierweg: '🥾',
};

export const DOG_DEFAULT_FILTERS: DogExploreFilters = {
  radiusKm: 5,
  kinds: {
    wald: true,
    wiese: true,
    hundewiese: true,
    hundestrand: true,
    park: true,
    spazierweg: true,
  },
  ownPins: true,
  otherUserPins: true,
};

export const DOG_STATE_KEY = 'nasebaer-demo-state';
export const DOG_STATE_KEY_LEGACY = [
  'pfotenatlas-demo-state',
  'nasenbaer-demo-state',
  'dog-demo-state',
] as const;

export const NASEBAER_BRAND = {
  name: 'Nasebär',
  slogan: 'Der Pfoten-Atlas',
} as const;

/** @deprecated Alias für ältere Imports */
export const PFOTENATLAS_BRAND = NASEBAER_BRAND;
export const NASENBAER_BRAND = NASEBAER_BRAND;

export const DOG_NAME_SUGGESTIONS = [NASEBAER_BRAND.name] as const;

/** Haversine-Distanz in km */
export function dogDistanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function dogDefaultCenter(): { lat: number; lng: number } {
  return { lat: 52.520008, lng: 13.404954 };
}
