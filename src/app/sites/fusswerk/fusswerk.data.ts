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
  tagline: 'Fußpflegestudio',
  claim: 'Gesunde Füße. Schöne Momente.',
  city: 'Bad Rothenfelde',
  street: 'Salinenstraße 2–6',
  zip: '49214',
  opened: '01.07.2026',
  former: 'ehemals Nellys Juice Bar',
  phone: '05224 000000',
  phoneTel: 'tel:+495224000000',
  email: 'hallo@fusswerk-bad-rothenfelde.de',
  emailMailto: 'mailto:hallo@fusswerk-bad-rothenfelde.de',
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
    summary: 'Nägel pflegen, Hornhaut entfernen, Haut beruhigen — alles in einem Termin.',
    includes: ['Fußbad', 'Nägel kürzen & formen', 'Hornhaut schonend entfernen', 'Pflege zum Abschluss'],
    duration: '45 Minuten',
    durationMinutes: 45,
    fromPrice: 49,
  },
  {
    id: 'medical',
    num: '02',
    title: 'Medizinische Fußpflege',
    summary: 'Für empfindliche, belastete oder problematische Füße — behutsam und fachlich.',
    includes: ['Ausführliche Beratung', 'Schonende Behandlung', 'Hornhaut & Nagelpflege', 'Tipps für zu Hause'],
    duration: '55 Minuten',
    durationMinutes: 55,
    fromPrice: 59,
  },
  {
    id: 'wellness',
    num: '03',
    title: 'Fußbad & Massage',
    summary: 'Warmes Bad, sanfte Massage — ideal zum Entspannen und Durchatmen.',
    includes: ['Aromatisches Fußbad', 'Peeling', 'Entspannende Massage', 'Pflegende Creme'],
    duration: '30 Minuten',
    durationMinutes: 30,
    fromPrice: 35,
  },
  {
    id: 'senior',
    num: '04',
    title: 'Seniorenpflege',
    summary: 'Mehr Zeit, ruhiges Tempo und besondere Rücksicht — genau wie Sie es brauchen.',
    includes: ['Behutsame Behandlung', 'Hilfe beim Hinlegen & Aufstehen', 'Klare Erklärungen', 'Termine am Vormittag möglich'],
    duration: '50 Minuten',
    durationMinutes: 50,
    fromPrice: 52,
  },
];

export const FW_PRICE_TIERS: ReadonlyArray<FwPriceTier> = [
  {
    id: 'klassisch',
    name: 'Klassisch',
    subtitle: 'Die solide Fußpflege',
    price: 49,
    duration: '45 Minuten',
    highlights: [
      'Fußbad & Hautpflege',
      'Nägel formen',
      'Leichte Hornhaut',
      'Abschlusspflege',
    ],
  },
  {
    id: 'komfort',
    name: 'Komfort',
    subtitle: 'Pflege mit Massage',
    price: 69,
    duration: '60 Minuten',
    highlights: [
      'Alles aus „Klassisch“',
      'Warmes Fußbad mit Peeling',
      'Entspannende Massage',
      'Intensive Pflegecreme',
    ],
    featured: true,
  },
  {
    id: 'rundum',
    name: 'Rundum',
    subtitle: 'Medizinisch & ausführlich',
    price: 89,
    duration: '75 Minuten',
    highlights: [
      'Medizinische Fußpflege',
      'Ausführliches Fußbad',
      'Längere Massage',
      'Nagelpflege inkl. Lack',
    ],
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
