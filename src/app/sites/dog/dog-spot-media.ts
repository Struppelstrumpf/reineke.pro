import type { DogSpot } from './dog.data';

/** Nur echte, am Objekt hinterlegte Bild-URLs — keine Platzhalter. */

function commonsFileUrl(fileName: string, width = 720): string {
  const file = fileName.replace(/^File:/i, '').trim();
  if (!file) return '';
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;
}

function isDirectImageUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)) return true;
  if (/upload\.wikimedia\.org/i.test(url)) return true;
  if (/commons\.wikimedia\.org\/wiki\/Special:FilePath/i.test(url)) return true;
  if (/mapillary\.com/i.test(url)) return true;
  if (/flickr\.com/i.test(url)) return true;
  if (/openstreetmap\.org/i.test(url) && /photo/i.test(url)) return true;
  return false;
}

/** Bilder aus OSM-Tags am Punkt (image, Commons, Mapillary, …). */
export function imageUrlFromOsmTags(tags: Record<string, string>): string | undefined {
  for (let i = 0; i < 10; i++) {
    const key = i === 0 ? 'image' : `image:${i}`;
    const url = tags[key];
    if (url && isDirectImageUrl(url)) return url;
  }

  const commons = tags['wikimedia_commons'];
  if (commons) {
    const url = commonsFileUrl(commons);
    if (url) return url;
  }

  const mapillary = tags['mapillary'];
  if (mapillary && /^\d+$/.test(mapillary)) {
    return `https://images.mapillary.com/${mapillary}/thumb-2048.jpg`;
  }

  return undefined;
}

export function commonsUrlFromWikidataFilename(filename: string, width = 720): string {
  return commonsFileUrl(filename.startsWith('File:') ? filename : `File:${filename}`, width);
}

export function leashLabel(leash: 'frei' | 'teilweise' | 'pflicht'): string {
  if (leash === 'frei') return 'Freilauf möglich';
  if (leash === 'teilweise') return 'Leine teilweise';
  return 'Leine empfohlen / Pflicht';
}

export function sourceLabel(source: DogSpot['source']): string {
  if (source === 'osm') return 'OpenStreetMap';
  if (source === 'wikidata') return 'Wikidata';
  if (source === 'wikipedia') return 'Wikipedia';
  if (source === 'meldung') return 'Community-Meldung';
  return 'Community';
}

export function imageSourceLabel(spot: DogSpot): string | null {
  if (!spot.imageUrl) return null;
  if (spot.imageSource === 'wikidata') return 'Bild: Wikidata';
  if (spot.imageSource === 'wikipedia') return 'Bild: Wikipedia';
  if (spot.imageSource === 'osm' || spot.source === 'osm') return 'Bild: OpenStreetMap';
  return null;
}
