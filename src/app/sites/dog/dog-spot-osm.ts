import { DOG_SPOT_LABELS, type DogSpot, type DogSpotKind } from './dog.data';
import { imageUrlFromOsmTags } from './dog-spot-media';

export type OsmElement = {
  id: number;
  type?: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/** OSM-Tags → Pfoten-Atlas-Kategorie (null = nicht anzeigen). */
export function classifyOsmSpotKind(tags: Record<string, string>): DogSpotKind | null {
  const leisure = tags['leisure'];
  const natural = tags['natural'];
  const landuse = tags['landuse'];
  const highway = tags['highway'];
  const route = tags['route'];
  const dog = tags['dog'];

  if (leisure === 'dog_park') return 'hundewiese';

  if (natural === 'beach' || (natural === 'coastline' && tags['surface'] === 'sand')) {
    return 'hundestrand';
  }
  if (leisure === 'beach_resort' && dog !== 'no') return 'hundestrand';

  if (
    natural === 'wood' ||
    natural === 'forest' ||
    natural === 'tree_row' ||
    landuse === 'forest' ||
    leisure === 'nature_reserve'
  ) {
    return 'wald';
  }

  if (
    landuse === 'meadow' ||
    landuse === 'grass' ||
    natural === 'grassland' ||
    natural === 'heath' ||
    natural === 'scrub'
  ) {
    return 'wiese';
  }

  if (
    leisure === 'park' ||
    leisure === 'garden' ||
    landuse === 'recreation_ground' ||
    landuse === 'village_green'
  ) {
    return 'park';
  }

  if (
    highway === 'path' ||
    highway === 'footway' ||
    highway === 'track' ||
    highway === 'bridleway' ||
    route === 'hiking' ||
    tags['route'] === 'foot' ||
    tags['sac_scale'] ||
    tags['trailblazed'] === 'yes'
  ) {
    return 'spazierweg';
  }

  return null;
}

export function leashFromOsmTags(tags: Record<string, string>, kind: DogSpotKind): DogSpot['leash'] {
  const dog = tags['dog'];
  if (dog === 'yes' || dog === 'unleashed') return 'frei';
  if (dog === 'leashed' || dog === 'no') return 'pflicht';
  if (kind === 'hundewiese') return 'frei';
  if (kind === 'wald' || kind === 'wiese') return 'teilweise';
  return 'pflicht';
}

export function spotNameFromOsm(tags: Record<string, string>, kind: DogSpotKind): string {
  return tags['name'] || tags['ref'] || DOG_SPOT_LABELS[kind];
}

export function buildOverpassSpotQuery(lat: number, lng: number, radiusM: number): string {
  const r = radiusM;
  const around = `(around:${r},${lat},${lng})`;
  return `
    [out:json][timeout:25];
    (
      node["leisure"="dog_park"]${around};
      way["leisure"="dog_park"]${around};
      node["natural"="wood"]${around};
      way["natural"="wood"]${around};
      node["natural"="forest"]${around};
      way["natural"="forest"]${around};
      way["landuse"="forest"]${around};
      node["landuse"="meadow"]${around};
      way["landuse"="meadow"]${around};
      way["landuse"="grass"]${around};
      node["natural"="grassland"]${around};
      way["natural"="grassland"]${around};
      node["natural"="heath"]${around};
      way["natural"="heath"]${around};
      node["natural"="beach"]${around};
      way["natural"="beach"]${around};
      node["leisure"="beach_resort"]${around};
      node["leisure"="park"]${around};
      way["leisure"="park"]${around};
      node["leisure"="garden"]["access"!~"private|no"]${around};
      way["leisure"="garden"]["access"!~"private|no"]${around};
      way["landuse"="recreation_ground"]${around};
      node["leisure"="nature_reserve"]${around};
      way["leisure"="nature_reserve"]${around};
      way["highway"~"path|footway|track|bridleway"]["name"]${around};
      way["route"="hiking"]${around};
      relation["route"="hiking"]${around};
    );
    out center 80;
  `;
}

export function osmElementToSpot(el: OsmElement): DogSpot | null {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat == null || lng == null) return null;

  const tags = el.tags ?? {};
  const kind = classifyOsmSpotKind(tags);
  if (!kind) return null;

  const name = spotNameFromOsm(tags, kind);
  const desc =
    tags['description'] ||
    tags['note'] ||
    tags['fixme'] ||
    tags['dog:description'] ||
    undefined;
  const imageUrl = imageUrlFromOsmTags(tags);
  const osmType = el.type ?? 'node';

  return {
    id: `osm-${el.id}`,
    kind,
    name,
    lat,
    lng,
    rating: 4.0 + (el.id % 10) / 10,
    tipCount: desc ? (el.id % 8) + 2 : el.id % 5,
    leash: leashFromOsmTags(tags, kind),
    snippet: desc ?? describeSpotFromTags(tags, kind),
    description: desc,
    imageUrl,
    imageSource: imageUrl ? ('osm' as const) : undefined,
    source: 'osm',
    osmUrl: `https://www.openstreetmap.org/${osmType}/${el.id}`,
    wikidataId: tags['wikidata'],
    wikipediaTag: tags['wikipedia'],
  };
}

function describeSpotFromTags(tags: Record<string, string>, kind: DogSpotKind): string {
  const parts: string[] = [`${DOG_SPOT_LABELS[kind]} aus OpenStreetMap`];
  if (tags['operator']) parts.push(`Betreiber: ${tags['operator']}`);
  if (tags['surface']) parts.push(`Boden: ${tags['surface']}`);
  if (tags['dog'] === 'yes') parts.push('Hunde erlaubt');
  if (tags['dog'] === 'leashed') parts.push('Leine laut OSM');
  if (tags['access'] === 'private') parts.push('Zugang eingeschränkt');
  return parts.join(' · ');
}
