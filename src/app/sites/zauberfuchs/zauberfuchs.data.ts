export interface ZfPlan {
  id: string;
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  perks: string[];
  featured?: boolean;
}

export interface ZfShopItem {
  id: string;
  name: string;
  price: string;
  tag: string;
  origin: string;
  blurb: string;
}

export interface ZfCharacter {
  id: string;
  name: string;
  role: string;
  home: string;
  blurb: string;
  emoji: string;
  portrait: string;
}

export interface ZfPlace {
  id: string;
  name: string;
  blurb: string;
}

export interface ZfLetterBeat {
  title: string;
  text: string;
}

export const ZF_BRAND = {
  name: 'Zauberfuchs',
  product: 'Zauberpost',
  tagline: 'Ein gemütliches Universum zum Sammeln und Staunen',
  email: 'hallo@zauberfuchs.net',
  vision:
    'Keine Produktmarke — ein gemütliches Universum. Vorfreude auf Post, Sammeln, Staunen und Geborgenheit.',
} as const;

/** Orte aus Band 1 — Das Große Buch des Zauberwaldes */
export const ZF_PLACES: ZfPlace[] = [
  {
    id: 'moosheim',
    name: 'Moosheim',
    blurb: 'Herz der Welt. Häuser aus weichen Mooshügeln, Dächer mit Gärten, Dorfplatz und Post.',
  },
  {
    id: 'pilzwald',
    name: 'Pilzwald',
    blurb: 'Wohnort des Zauberfuchses. Fuchsbau-Hütte mit Kamin, Schreibplatz und Notizen — hier entstehen Geschichten.',
  },
  {
    id: 'mondlichtwald',
    name: 'Mondlichtwald',
    blurb: 'Nox lebt in der ältesten Eiche. Eine Bibliothek im hohlen Stamm, Ebene für Ebene bis zur Krone.',
  },
  {
    id: 'seerosenfluss',
    name: 'Seerosenfluss',
    blurb: 'Verbindet die Welt. Moss am Ufer mit Floß und Bootsanleger, Steinbrücken zwischen den Wegen.',
  },
  {
    id: 'blumenwiese',
    name: 'Blumenwiese',
    blurb: 'Heimat von Sum. Blüten, Honig, Bienenstücke und Farben, soweit das Auge reicht.',
  },
  {
    id: 'kraeuterhain',
    name: 'Kräuterhain',
    blurb: 'Verfallene Burg als geheimes Zuhause von Puff — später entdeckt, immer ein bisschen chaotisch.',
  },
  {
    id: 'sternenhuegel',
    name: 'Sternenhügel',
    blurb: 'Heimat von Xenufur. Tagsüber Nebel, nachts ein Teleskop und der ganze Himmel.',
  },
  {
    id: 'mondberg',
    name: 'Mondberg',
    blurb: 'Wo der Mond dem Wald am nächsten scheint — still, hoch und voller kleiner Geheimnisse.',
  },
];

export const ZF_CHARACTERS: ZfCharacter[] = [
  {
    id: 'zauberfuchs',
    name: 'Zauberfuchs',
    role: 'Geschichtensammler',
    home: 'Pilzwald',
    blurb: 'Kreativer Helfer mit Hut. Schreibt, sammelt und schickt die kleinen Alltagsabenteuer in die Welt.',
    emoji: '🦊',
    portrait: '/zauberfuchs/characters/zauberfuchs.webp',
  },
  {
    id: 'lumi',
    name: 'Lumi',
    role: 'Schneckenpostbotin',
    home: 'überall',
    blurb: 'Verbindet alle Orte — langsam, zuverlässig und mit dem wichtigsten Auftrag: Vorfreude bringen.',
    emoji: '🐌',
    portrait: '/zauberfuchs/characters/lumi.webp',
  },
  {
    id: 'nox',
    name: 'Nox',
    role: 'Bibliothekarin',
    home: 'Mondlichtwald',
    blurb: 'Weise Eule in der ältesten Eiche. Kennt jede Geschichte und fliegt direkt ins Nest.',
    emoji: '🦉',
    portrait: '/zauberfuchs/characters/nox.webp',
  },
  {
    id: 'moss',
    name: 'Moss',
    role: 'Pflanzenfreund',
    home: 'Seerosenfluss',
    blurb: 'Moosiger Frosch am Fluss. Floß, Anleger und ein Herz für alles, was wächst.',
    emoji: '🐸',
    portrait: '/zauberfuchs/characters/moss.webp',
  },
  {
    id: 'sum',
    name: 'Sum',
    role: 'Honigfreude',
    home: 'Blumenwiese',
    blurb: 'Fröhliche Biene. Bringt Farbe, Summen und kleine süße Überraschungen mit.',
    emoji: '🐝',
    portrait: '/zauberfuchs/characters/sum.webp',
  },
  {
    id: 'puff',
    name: 'Puff',
    role: 'Chaotischer Geist',
    home: 'Kräuterhain',
    blurb: 'Lebt in der verfallenen Burg. Magie, die manchmal daneben geht — und genau deshalb bleibt.',
    emoji: '👻',
    portrait: '/zauberfuchs/characters/puff.webp',
  },
  {
    id: 'xenufur',
    name: 'Xenufur',
    role: 'Sternenleser',
    home: 'Sternenhügel',
    blurb: 'Hirsch hinter dem Nebelschleier. Nachts beobachtet er die Sterne mit seinem Teleskop.',
    emoji: '🦌',
    portrait: '/zauberfuchs/characters/xenufur.webp',
  },
];

/** Aufbau einer nummerierten Zauberpost */
export const ZF_LETTER_BEATS: ZfLetterBeat[] = [
  {
    title: 'Brief mit Geschichte',
    text: 'Eine kleine Alltagsgeschichte aus dem Zauberwald — ohne Bösewichter, voll Geborgenheit.',
  },
  {
    title: 'Postkarte',
    text: 'Ein Motiv aus Moosheim, Pilzwald oder einem anderen Ort — zum Aufhängen oder Weiterschicken.',
  },
  {
    title: '3–5 Sticker',
    text: 'Zum Sammeln und Kleben. Jeder Sticker gehört zur Welt, nicht zur Masse.',
  },
  {
    title: 'Sammelkarte',
    text: 'Ein Charakter oder Ort — Stück für Stück wird daraus dein eigenes Weltlexikon.',
  },
  {
    title: 'Überraschung',
    text: 'Manchmal ein Lesezeichen, Mini-Print oder ein winziges Erinnerungsstück.',
  },
];

export const ZF_RULES = [
  'Keine Bösewichter — nur kleine Alltagsabenteuer.',
  'Jeder lebt dort, wo seine Natur hinpasst.',
  'Magie entsteht aus Alltag, Natur und Charakter.',
  'Qualität vor Quantität. Kein Produkt ohne Geschichte.',
] as const;

export const ZF_PLANS: ZfPlan[] = [
  {
    id: 'issue',
    name: 'Einzelne Zauberpost',
    price: '13,90 €',
    cadence: 'pro Ausgabe',
    blurb: 'Nummerierte Ausgabe (#001 …) mit Untertitel — handgemacht statt Massenware.',
    perks: [
      'Brief mit Geschichte',
      'Postkarte',
      '3–5 Sticker',
      'Sammelkarte',
      'kleine Überraschung',
    ],
    featured: true,
  },
  {
    id: 'abo',
    name: 'Sanftes Abo',
    price: 'bald',
    cadence: 'optional später',
    blurb: 'Erst wächst die Welt organisch — ein Abo kommt, wenn es sich nach Zauberfuchs anfühlt.',
    perks: ['Regelmäßige Ausgaben', 'keine Hetze', 'immer mit Geschichte', 'weiterhin handgemacht'],
  },
];

export const ZF_SHOP: ZfShopItem[] = [
  {
    id: 'post-001',
    name: 'Zauberpost #001',
    price: '13,90 €',
    tag: 'Zauberpost',
    origin: 'Pilzwald',
    blurb: 'Die erste nummerierte Ausgabe — Brief, Postkarte, Sticker, Sammelkarte & Überraschung.',
  },
  {
    id: 'sammelkarten',
    name: 'Weltlexikon-Karten',
    price: '9,90 €',
    tag: 'Sammeln',
    origin: 'Mondlichtwald',
    blurb: 'Sammelkarten wie aus Nox’ Bibliothek — Charaktere und Orte zum Nachschlagen.',
  },
  {
    id: 'sticker',
    name: 'Moosheim-Sticker',
    price: '6,90 €',
    tag: 'Sticker',
    origin: 'Moosheim',
    blurb: 'Weiche Motive vom Dorfplatz, den Mooshügel-Häusern und Lumis Postweg.',
  },
  {
    id: 'trank',
    name: 'Kräuterhain-Trank (Demo)',
    price: '8,50 €',
    tag: 'Erinnerung',
    origin: 'Kräuterhain',
    blurb: 'Ein Fläschchen mit Geschichte aus Puffs Burg — Fake-Shop, echte Stimmung.',
  },
  {
    id: 'print-map',
    name: 'Karte des Zauberwaldes',
    price: '18,90 €',
    tag: 'Print',
    origin: 'Sternenhügel',
    blurb: 'Alle Orte auf einem Blatt — zum An die Wand hängen und Träumen.',
  },
  {
    id: 'figur',
    name: 'Bewohner-Figur',
    price: '22,90 €',
    tag: 'Figur',
    origin: 'Zauberwald',
    blurb: 'Kleine Figuren der Bewohner — Erinnerungsstücke aus derselben Welt.',
  },
];

export const ZF_SAMPLE_ISSUE = {
  number: '#001',
  subtitle: 'Willkommen in Moosheim',
  teaser:
    'Lumi trägt den ersten Brief über den Seerosenfluss. Im Pilzwald knistert der Kamin, und irgendwo summt Sum schon die Melodie für die Sticker.',
} as const;

/** Umblätterbares Zauberheft — fertige Bildseiten */
export interface ZfComicPage {
  id: string;
  kind: 'cover' | 'spread';
  image: string;
  label: string;
  alt: string;
}

export const ZF_COMIC_STORY = {
  series: 'Zauberheft',
  title: 'Der erste Brief',
  subtitle: 'Zauberheft Nr. 1 · Geschichten aus dem Zauberwald',
  pages: [
    {
      id: 'cover',
      kind: 'cover' as const,
      image: '/zauberfuchs/comics/cover.webp',
      label: 'Einband',
      alt: 'Zauberheft-Cover: Der erste Brief — Zauberfuchs hält einen versiegelten Brief im Pilzwald',
    },
    {
      id: 'spread-1',
      kind: 'spread' as const,
      image: '/zauberfuchs/comics/spread-01.webp',
      label: 'Aufschlag 1',
      alt: 'Zauberheft: Zauberfuchs schreibt den Brief, Lumi klopft an die Tür',
    },
    {
      id: 'spread-2',
      kind: 'spread' as const,
      image: '/zauberfuchs/comics/spread-02.webp',
      label: 'Aufschlag 2',
      alt: 'Zauberheft: Lumi trägt den Brief zum Seerosenfluss',
    },
    {
      id: 'spread-3',
      kind: 'spread' as const,
      image: '/zauberfuchs/comics/spread-03.webp',
      label: 'Aufschlag 3',
      alt: 'Zauberheft: Am Fluss und Nox öffnet den Brief in der Eiche',
    },
    {
      id: 'spread-4',
      kind: 'spread' as const,
      image: '/zauberfuchs/comics/spread-04.webp',
      label: 'Aufschlag 4',
      alt: 'Zauberheft: Abend in Moosheim — Ende der Geschichte',
    },
  ] satisfies ZfComicPage[],
} as const;

export const ZF_PARENTS = {
  kicker: 'Für Eltern',
  title: 'Ruhig bezahlen. Klar verstehen.',
  lead:
    'Zauberpost ist für Kinder zum Staunen — und für Erwachsene zum entspannten Entscheiden. Kein Druck, keine Abo-Falle, keine versteckten Kosten.',
  points: [
    {
      title: 'Transparente Preise',
      text: 'Einzelausgaben mit klarem Preis. Was du vormerkst, ist genau das — Demo heute, echte Bestellung später ohne Überraschungen.',
    },
    {
      title: 'Kein Abo-Zwang',
      text: 'Erst die Welt, dann optional ein sanftes Abo. Du entscheidest, wann es sich richtig anfühlt.',
    },
    {
      title: 'Altersgerecht & geborgen',
      text: 'Keine Bösewichter, keine Hetze. Kleine Alltagsabenteuer, die man gemeinsam lesen und sammeln kann.',
    },
    {
      title: 'Datenschutz & Ruhe',
      text: 'Weniger Klicks, weniger Lärm. Wenn der Checkout kommt, bleibt er schlicht — ohne dunkle Patterns.',
    },
  ],
} as const;
