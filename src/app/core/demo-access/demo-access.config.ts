export type DemoSlug = 'weisser-schaefer';

export type DemoAccessEntry = {
  slug: DemoSlug;
  label: string;
  hint: string;
};

/** Persönliche Demo-Codes für Kunden — Code → Demo-Route */
export const DEMO_ACCESS_CODES: Readonly<Record<string, DemoAccessEntry>> = {
  'WEISSER2024': {
    slug: 'weisser-schaefer',
    label: 'Weißer Schäfer',
    hint: 'B2B-Bestellportal · Naturdärme',
  },
  'SCHAEFER-DEMO': {
    slug: 'weisser-schaefer',
    label: 'Weißer Schäfer',
    hint: 'B2B-Bestellportal · Naturdärme',
  },
};

export function resolveDemoCode(raw: string): DemoAccessEntry | null {
  const key = raw.trim().toUpperCase().replace(/\s+/g, '');
  return DEMO_ACCESS_CODES[key] ?? null;
}

export function demoRoute(slug: DemoSlug): string {
  return `/demo/${slug}`;
}
