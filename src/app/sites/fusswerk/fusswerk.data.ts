export type FwService = {
  id: string;
  num: string;
  title: string;
  summary: string;
  includes: string[];
  /** Anzeige-Text, wird aus durationMinutes abgeleitet */
  duration: string;
  durationMinutes: number;
  fromPrice: number;
};

export type FwPriceTier = {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  duration: string;
  highlights: string[];
  featured?: boolean;
};

export const FW_BUSINESS = {
  name: 'Fusswerk',
  tagline: 'Fußpflegeinstitut',
  claim: 'Füße bewegen uns.',
  city: 'Bad Rothenfelde',
  street: 'Salinenstraße 2–6',
  zip: '49214',
  opened: '01.07.2026',
  former: 'ehemals Nellys Juice Bar',
  phone: '0171 5790590',
  phoneTel: 'tel:+491715790590',
  email: 'info@fusswerk-rothenfelde.de',
  emailMailto: 'mailto:info@fusswerk-rothenfelde.de',
  instagram: 'https://www.instagram.com/',
  facebook: 'https://www.facebook.com/',
  googleReviews: 'https://www.google.com/maps',
  googleRating: '4,9 ★★★★★ · 38 Google-Bewertungen',
} as const;

export const FW_BOOKING_SETTINGS_DEFAULT = {
  defaultDurationMinutes: 45,
  useServiceDurations: true,
  bufferMinutes: 10,
  slotStepMinutes: 15,
  closingBufferSlots: 0,
  gapBeforeBookingMinutes: 45,
  blockDefaultMinutes: 30,
} as const;

export const FW_HOURS = [
  { days: 'Montag – Freitag', time: '09:00 – 18:00 Uhr' },
  { days: 'Samstag', time: '09:00 – 14:00 Uhr' },
  { days: 'Sonntag', time: 'geschlossen' },
] as const;

export type FwPaymentMethod = {
  id: string;
  label: string;
  variant?: 'cash' | 'ec' | 'visa' | 'mastercard' | 'maestro' | 'apple' | 'google';
};

export const FW_PAYMENT_METHODS: readonly FwPaymentMethod[] = [
  { id: 'cash', label: 'Bar', variant: 'cash' },
  { id: 'ec', label: 'EC-Karte / Girocard', variant: 'ec' },
  { id: 'visa', label: 'Visa', variant: 'visa' },
  { id: 'mastercard', label: 'Mastercard', variant: 'mastercard' },
  { id: 'maestro', label: 'Maestro', variant: 'maestro' },
  { id: 'apple', label: 'Apple Pay', variant: 'apple' },
  { id: 'google', label: 'Google Pay', variant: 'google' },
];

export const FW_SERVICES: ReadonlyArray<FwService> = [
  {
    id: 'classic',
    num: '01',
    title: 'Klassische Fußpflege',
    summary: 'Fußbad, Hornhaut, Nägel und Nagelhaut — inklusive Abschlusspflege.',
    includes: [
      'Fußbad',
      'Entfernen von Hornhaut',
      'Kürzen & Feilen der Nägel',
      'Pflege der Nagelhaut',
      'Abschließende Pflegecreme',
      'Behandlung auch für Diabetikerfüße möglich (im Rahmen der klassischen Fußpflege)',
    ],
    duration: '45 Minuten',
    durationMinutes: 45,
    fromPrice: 48,
  },
  {
    id: 'shellac',
    num: '02',
    title: 'Fußpflege mit Shellac / UV-Lack / Gel',
    summary: 'Klassische Fußpflege mit langlebiger Lackierung.',
    includes: [
      'Alle Leistungen der klassischen Fußpflege',
      'Lackierung mit Shellac, UV-Lack oder Gel',
      'Behandlung auch für Diabetikerfüße möglich',
    ],
    duration: '60 Minuten',
    durationMinutes: 60,
    fromPrice: 65,
  },
];

export const FW_PRICE_TIERS: ReadonlyArray<FwPriceTier> = [
  {
    id: 'klassisch',
    name: 'Klassische Fußpflege',
    subtitle: 'Fußbad, Hornhaut & Nagelpflege',
    price: 48,
    duration: '45 Minuten',
    highlights: [
      'Fußbad',
      'Hornhaut entfernen',
      'Nägel kürzen & feilen',
      'Nagelhaut pflegen',
      'Abschließende Pflegecreme',
      'Auch für Diabetikerfüße',
    ],
  },
  {
    id: 'shellac',
    name: 'Mit Shellac / UV-Lack / Gel',
    subtitle: 'Klassische Fußpflege mit Lack',
    price: 65,
    duration: '60 Minuten',
    highlights: [
      'Alle Leistungen der klassischen Fußpflege',
      'Lackierung mit Shellac, UV-Lack oder Gel',
      'Auch für Diabetikerfüße',
    ],
    featured: true,
  },
];

export const FW_STEPS = [
  {
    step: '1',
    title: 'Anrufen oder schreiben',
    text: 'Sagen Sie uns, wann es Ihnen passt — wir finden einen ruhigen Termin für Sie.',
  },
  {
    step: '2',
    title: 'Bei uns ankommen',
    text: 'Salinenstraße 2–6, mitten in Bad Rothenfelde. Wir nehmen uns Zeit für Sie.',
  },
  {
    step: '3',
    title: 'Entspannt nach Hause',
    text: 'Gepflegte Füße, klare Empfehlungen — und ein gutes Gefühl.',
  },
] as const;

export const FW_TRUST = [
  'Einmal-Instrumente & hygienische Abläufe',
  'Ruhige Termine — ohne Hetze',
  'Große, gut lesbare Preise',
  'Parkplätze in der Nähe',
  'Barrierefreier Zugang auf Anfrage',
] as const;

export const FW_TESTIMONIALS = [
  {
    quote: 'Endlich jemand, der Zeit hat und alles in Ruhe erklärt. Ich fühle mich sehr gut aufgehoben.',
    author: 'Helga W.',
    meta: 'Bad Rothenfelde',
  },
  {
    quote: 'Sauber, freundlich und unkompliziert. Genau so stelle ich mir ein Fußpflegestudio vor.',
    author: 'Klaus M.',
    meta: 'Stammgast',
  },
] as const;
