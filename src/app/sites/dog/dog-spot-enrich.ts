import type { DogSpot } from './dog.data';
import { commonsUrlFromWikidataFilename } from './dog-spot-media';

const WIKIDATA_BATCH = 40;

type WikidataEntities = {
  entities?: Record<
    string,
    {
      claims?: {
        P18?: Array<{ mainsnak?: { datavalue?: { value?: string } } }>;
      };
    }
  >;
};

/** Ergänzt Spots ohne Bild via Wikidata & Wikipedia (nur am Objekt verknüpfte Medien). */
export async function enrichSpotImages(spots: DogSpot[]): Promise<DogSpot[]> {
  const needWikidata = spots.filter((s) => !s.imageUrl && s.wikidataId);
  const wikidataImages = await fetchWikidataImages(needWikidata.map((s) => s.wikidataId!));

  const enriched = await Promise.all(
    spots.map(async (spot) => {
      if (spot.imageUrl) return spot;

      const wdId = spot.wikidataId;
      if (wdId && wikidataImages[wdId]) {
        return {
          ...spot,
          imageUrl: wikidataImages[wdId],
          imageSource: 'wikidata' as const,
          source: 'wikidata' as const,
        } satisfies DogSpot;
      }

      if (spot.wikipediaTag) {
        const wikiImage = await fetchWikipediaLeadImage(spot.wikipediaTag);
        if (wikiImage) {
          return {
            ...spot,
            imageUrl: wikiImage.url,
            imageSource: 'wikipedia' as const,
            source: 'wikipedia' as const,
            wikipediaUrl: wikiImage.pageUrl,
          } satisfies DogSpot;
        }
      }

      return spot;
    }),
  );

  return enriched;
}

async function fetchWikidataImages(ids: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids.map((id) => id.replace(/^Q/i, 'Q')))].filter(Boolean);
  const out: Record<string, string> = {};
  if (!unique.length) return out;

  for (let i = 0; i < unique.length; i += WIKIDATA_BATCH) {
    const batch = unique.slice(i, i + WIKIDATA_BATCH);
    try {
      const url = new URL('https://www.wikidata.org/w/api.php');
      url.searchParams.set('action', 'wbgetentities');
      url.searchParams.set('ids', batch.join('|'));
      url.searchParams.set('props', 'claims');
      url.searchParams.set('format', 'json');
      url.searchParams.set('origin', '*');

      const res = await fetch(url.toString());
      if (!res.ok) continue;
      const data = (await res.json()) as WikidataEntities;
      for (const [id, entity] of Object.entries(data.entities ?? {})) {
        const filename = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
        if (typeof filename === 'string' && filename.length > 0) {
          out[id] = commonsUrlFromWikidataFilename(filename);
        }
      }
    } catch {
      /* Wikidata optional */
    }
  }

  return out;
}

async function fetchWikipediaLeadImage(
  wikipediaTag: string,
): Promise<{ url: string; pageUrl: string } | null> {
  const { lang, title } = parseWikipediaTag(wikipediaTag);
  if (!title) return null;

  try {
    const apiTitle = encodeURIComponent(title.replace(/ /g, '_'));
    const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${apiTitle}`;
    const res = await fetch(summaryUrl, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      thumbnail?: { source?: string };
      content_urls?: { desktop?: { page?: string } };
      originalimage?: { source?: string };
    };
    const url = data.originalimage?.source || data.thumbnail?.source;
    if (!url || !/^https?:\/\//i.test(url)) return null;
    return {
      url,
      pageUrl: data.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${apiTitle}`,
    };
  } catch {
    return null;
  }
}

function parseWikipediaTag(tag: string): { lang: string; title: string } {
  if (tag.includes(':')) {
    const [lang, ...rest] = tag.split(':');
    return { lang: lang || 'de', title: rest.join(':').trim() };
  }
  return { lang: 'de', title: tag.trim() };
}
