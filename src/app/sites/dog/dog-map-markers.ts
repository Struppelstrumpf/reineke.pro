import type * as L from 'leaflet';
import { DOG_SPOT_EMOJI, type DogAlert, type DogSpot, type DogSpotKind } from './dog.data';

export type DogSpotMarkerOptions = L.MarkerOptions & { dogKind?: DogSpotKind };

export function spotMarkerHtml(spot: DogSpot, selected: boolean, hasCommunity = false): string {
  const emoji = spot.isUserPin && spot.pinEmoji ? spot.pinEmoji : DOG_SPOT_EMOJI[spot.kind];
  const sel = selected ? ' dog-map__spot-pin--selected' : '';
  let star = '';
  if (spot.isUserPin) {
    star = '<span class="dog-map__spot-pin-star dog-map__spot-pin-star--user" aria-hidden="true">★</span>';
  } else if (hasCommunity) {
    star = '<span class="dog-map__spot-pin-star dog-map__spot-pin-star--community" aria-hidden="true">★</span>';
  }
  const priv = spot.pinVisibility === 'private' ? ' dog-map__spot-pin--private' : '';
  return `<button type="button" class="dog-map__spot-pin${sel}${priv}" data-kind="${spot.kind}" aria-label="${spot.name}">
    <span class="dog-map__spot-pin-glow"></span>
    <span class="dog-map__spot-pin-ico">${emoji}</span>
    ${star}
  </button>`;
}

export function spotClusterHtml(dominantKind: DogSpotKind, count: number): string {
  const emoji = DOG_SPOT_EMOJI[dominantKind];
  const label = count === 1 ? '1 Ort' : `${count} Orte`;
  return `<div class="dog-map__cluster" role="img" aria-label="${label}">
    <span class="dog-map__cluster-glow"></span>
    <span class="dog-map__cluster-ico">${emoji}</span>
    <span class="dog-map__cluster-count">${count}</span>
  </div>`;
}

export function dominantSpotKind(markers: L.Marker[]): DogSpotKind {
  const counts = new Map<DogSpotKind, number>();
  for (const marker of markers) {
    const kind = (marker.options as DogSpotMarkerOptions).dogKind;
    if (!kind) continue;
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  return pickDominantKind(counts);
}

export function dominantSpotKindFromSpots(spots: DogSpot[]): DogSpotKind {
  const counts = new Map<DogSpotKind, number>();
  for (const spot of spots) {
    counts.set(spot.kind, (counts.get(spot.kind) ?? 0) + 1);
  }
  return pickDominantKind(counts);
}

function pickDominantKind(counts: Map<DogSpotKind, number>): DogSpotKind {
  let best: DogSpotKind = 'wald';
  let bestCount = 0;
  for (const [kind, n] of counts) {
    if (n > bestCount) {
      best = kind;
      bestCount = n;
    }
  }
  return best;
}

export function alertMarkerHtml(alert: DogAlert, selected: boolean): string {
  const danger = alert.kind === 'giftkoeder' || alert.severity === 'danger';
  const sel = selected ? ' dog-map__alert-pin--selected' : '';
  const cls = danger ? ' dog-map__alert-pin--danger' : ` dog-map__alert-pin--${alert.severity}`;
  const icon = alert.kind === 'giftkoeder' ? '!' : '⚠';
  return `<button type="button" class="dog-map__alert-pin${cls}${sel}" aria-label="${alert.title}">
    <span class="dog-map__alert-pin-ring"></span>
    <span class="dog-map__alert-pin-ico">${icon}</span>
  </button>`;
}
