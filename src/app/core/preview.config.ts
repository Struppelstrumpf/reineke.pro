/**
 * Reineke GbR — portfolio preview links (single deployment).
 * Paths are relative to site origin (e.g. https://example.com/pizzeria-demo).
 */
export type PreviewSiteId = 'pizzeria' | 'weisser-schaefer';

export const PREVIEW_STUDIO = {
  name: 'Reineke GbR',
  role: 'Webdesign-Studio · Individuelle Websites',
  email: 'info@reineke.pro',
  phone: '015561 048098',
  phoneTel: '+4915561048098',
} as const;

export const PREVIEW_SITES: ReadonlyArray<{
  id: PreviewSiteId;
  label: string;
  hint: string;
  href: string;
}> = [
  {
    id: 'pizzeria',
    label: 'La Fornace (Demo)',
    hint: 'Video-Hero · Öffnungszeiten · Showcase',
    href: '/pizzeria-demo',
  },
];
