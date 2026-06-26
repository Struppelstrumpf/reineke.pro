import type { DogSpot } from './dog.data';

export type DogSpotDisplay =
  | { type: 'spot'; spot: DogSpot }
  | { type: 'cluster'; spots: DogSpot[]; lat: number; lng: number };

/** Raster-Cluster ab Zoom < 16 — stabil ohne leaflet.markercluster. */
export function groupSpotsForDisplay(spots: DogSpot[], zoom: number): DogSpotDisplay[] {
  const cell = clusterCellDeg(zoom);
  if (cell == null) {
    return spots.map((spot) => ({ type: 'spot', spot }));
  }

  const buckets = new Map<string, DogSpot[]>();
  for (const spot of spots) {
    const latKey = Math.floor(spot.lat / cell);
    const lngKey = Math.floor(spot.lng / cell);
    const key = `${latKey}:${lngKey}`;
    const list = buckets.get(key);
    if (list) list.push(spot);
    else buckets.set(key, [spot]);
  }

  const out: DogSpotDisplay[] = [];
  for (const group of buckets.values()) {
    if (group.length === 1) {
      out.push({ type: 'spot', spot: group[0]! });
      continue;
    }
    const lat = group.reduce((sum, s) => sum + s.lat, 0) / group.length;
    const lng = group.reduce((sum, s) => sum + s.lng, 0) / group.length;
    out.push({ type: 'cluster', spots: group, lat, lng });
  }
  return out;
}

function clusterCellDeg(zoom: number): number | null {
  if (zoom >= 16) return null;
  if (zoom >= 15) return 0.0045;
  if (zoom >= 14) return 0.0075;
  if (zoom >= 13) return 0.012;
  if (zoom >= 12) return 0.02;
  return 0.034;
}
