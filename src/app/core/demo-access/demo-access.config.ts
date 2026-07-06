export type DemoSlug = 'weisser-schaefer' | 'fusswerk';

export type DemoAccessEntry = {
  slug: DemoSlug;
  label: string;
  hint: string;
  /** z. B. „studio“ → /demo/fusswerk/studio */
  subPath?: string;
};

/** Persönliche Demo-Codes für Kunden — Code → Demo-Route */
export const DEMO_ACCESS_CODES: Readonly<Record<string, DemoAccessEntry>> = {
  WEISSER2024: {
    slug: 'weisser-schaefer',
    label: 'Weißer Schäfer',
    hint: 'B2B-Bestellportal · Naturdärme',
  },
  'SCHAEFER-DEMO': {
    slug: 'weisser-schaefer',
    label: 'Weißer Schäfer',
    hint: 'B2B-Bestellportal · Naturdärme',
  },
  FUSSWERK: {
    slug: 'fusswerk',
    label: 'Fusswerk',
    hint: 'Fußpflegestudio · Bad Rothenfelde',
  },
  DEMOCODESTUDIO: {
    slug: 'fusswerk',
    label: 'Fusswerk Studio',
    hint: 'Studio-Verwaltung · Termine & Inhalte',
    subPath: 'studio',
  },
};

export function resolveDemoCode(raw: string): DemoAccessEntry | null {
  const key = raw.trim().toUpperCase().replace(/\s+/g, '');
  return DEMO_ACCESS_CODES[key] ?? null;
}

export function demoRoute(entry: DemoAccessEntry): string {
  const base = `/demo/${entry.slug}`;
  return entry.subPath ? `${base}/${entry.subPath}` : base;
}
