/**
 * Reineke Fuchs — portfolio preview links (single deployment).
 * Paths are relative to site origin (e.g. https://example.com/sportflow).
 */
export type PreviewSiteId = 'sportflow' | 'cardealer' | 'restaurant' | 'sportlerklause' | 'pizzeria';

export const PREVIEW_STUDIO = {
  name: 'Reineke Fuchs',
  role: 'Web design studio · Fiverr previews',
  fiverrUrl: 'https://www.fiverr.com/s/7Y9ZkYe',
} as const;

export const PREVIEW_SITES: ReadonlyArray<{
  id: PreviewSiteId;
  label: string;
  hint: string;
  href: string;
}> = [
  {
    id: 'sportflow',
    label: 'SportFlow',
    hint: 'E‑commerce · sports bottles',
    href: '/sportflow',
  },
  {
    id: 'cardealer',
    label: 'Cardealer',
    hint: 'Automotive dealer landing page',
    href: '/cardealer',
  },
  {
    id: 'restaurant',
    label: 'Ember & Oak',
    hint: 'Restaurant & reservations',
    href: '/restaurant',
  },
  {
    id: 'sportlerklause',
    label: 'Sportlerklause Moorberg',
    hint: 'German inn · lunch · beer garden',
    href: '/sportlerklause',
  },
  {
    id: 'pizzeria',
    label: 'La Fornace (demo)',
    hint: 'Video hero · hours widget · showcase',
    href: '/pizzeria-demo',
  },
];
