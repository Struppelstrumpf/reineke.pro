import type { FwPriceTier, FwService } from './fusswerk.data';

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export const FW_CONTENT_KEY = 'fw-demo-content-v2';

export type FwHourRow = {
  days: string;
  /** Fließtext für Chat & Kurzlabels */
  time: string;
  ranges: FwTimeRange[];
  closed: boolean;
};

export type FwTimeRange = { from: string; to: string };

export type FwDaySchedule = {
  /** 0 = Sonntag … 6 = Samstag (wie Date.getDay()) */
  weekday: number;
  closed: boolean;
  ranges: FwTimeRange[];
};

export type FwOpeningHoursSchedule = FwDaySchedule[];

export type FwBookingSettings = {
  /** Einheitliche Dauer für alle Termine (wenn useServiceDurations = false) */
  defaultDurationMinutes: number;
  /** true = Dauer je Leistung aus dem Angebot, false = alle gleich lang */
  useServiceDurations: boolean;
  /** Puffer nach Behandlung (Aufräumen etc.) */
  bufferMinutes: number;
  /** Raster für mögliche Startzeiten */
  slotStepMinutes: number;
  /** Anzahl Zeitraster vor Ladenschluss ohne Online-Termine (0 = bis Schluss buchbar). */
  closingBufferSlots: number;
  /** Mindestabstand vor einem bestehenden Termin — Kunden dürfen nicht näher buchen (Minuten). */
  gapBeforeBookingMinutes: number;
};

export type FwBusinessContent = {
  phone: string;
  email: string;
  instagram: string;
  facebook: string;
  googleReviews: string;
  googleRating: number;
  googleReviewCount: number;
  opened: string;
  showOpeningNotice: boolean;
  street: string;
  zip: string;
  city: string;
};

export type FwHeroCopy = {
  titleLine1: string;
  titleLine2: string;
  lead: string;
  ctaPrimary: string;
  ctaSecondary: string;
  point1: string;
  point2: string;
  openingLabel: string;
};

export type FwSectionIntro = {
  eyebrow: string;
  title: string;
  lead?: string;
};

export type FwPageCopy = {
  hero: FwHeroCopy;
  angebot: FwSectionIntro;
  preise: FwSectionIntro;
  studioSection: FwSectionIntro & { body: string };
  kontakt: FwSectionIntro;
};

export type FwTheme = {
  fonts: {
    body: string;
    display: string;
    serif: string;
  };
  colors: {
    ink: string;
    muted: string;
    gold: string;
    blue: string;
    blueDeep: string;
    bg: string;
    paper: string;
  };
  sizes: {
    heroTitle: string;
    sectionTitle: string;
    body: string;
    eyebrow: string;
  };
  hero: {
    titleColor: string;
    leadColor: string;
  };
};

export type FwContentState = {
  business: FwBusinessContent;
  openingHours: FwOpeningHoursSchedule;
  services: FwService[];
  priceTiers: FwPriceTier[];
  trust: string[];
  copy: FwPageCopy;
  theme: FwTheme;
  bookingSettings: FwBookingSettings;
};

export const FW_FONT_OPTIONS = [
  { label: 'DM Sans', value: "'DM Sans', system-ui, sans-serif" },
  { label: 'Montserrat', value: "'Montserrat', system-ui, sans-serif" },
  { label: 'Cormorant Garamond', value: "'Cormorant Garamond', Georgia, serif" },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'System Sans', value: 'system-ui, -apple-system, sans-serif' },
] as const;

export const FW_SIZE_OPTIONS = [
  { label: 'Klein', value: '0.9rem' },
  { label: 'Normal', value: '1.0625rem' },
  { label: 'Groß', value: '1.2rem' },
  { label: 'Sehr groß', value: '1.35rem' },
] as const;

export const FW_HERO_SIZE_OPTIONS = [
  { label: 'Kompakt', value: 'clamp(2rem, 5vh, 3rem)' },
  { label: 'Standard', value: 'clamp(2.4rem, 6.5vh, 4rem)' },
  { label: 'Groß', value: 'clamp(2.8rem, 7vh, 4.6rem)' },
] as const;

export type FwVisualSectionId =
  | 'hero'
  | 'angebot'
  | 'preise'
  | 'studio'
  | 'kontakt'
  | 'stammdaten'
  | 'design';

export const FW_VISUAL_SECTIONS: ReadonlyArray<{ id: FwVisualSectionId; label: string; anchor?: string }> = [
  { id: 'hero', label: 'Startseite / Hero', anchor: 'top' },
  { id: 'angebot', label: 'Angebot', anchor: 'angebot' },
  { id: 'preise', label: 'Preise', anchor: 'preise' },
  { id: 'studio', label: 'Studio-Bereich', anchor: 'studio' },
  { id: 'kontakt', label: 'Kontakt', anchor: 'kontakt' },
  { id: 'stammdaten', label: 'Kontakt & Social' },
  { id: 'design', label: 'Schrift & Farben' },
];
