import type { DogAlertKind, DogSpotKind } from './dog.data';

export type DogTipArticle = {
  id: string;
  title: string;
  emoji: string;
  lead: string;
  sections: { heading?: string; body: string }[];
};

export type DogWeatherMood = 'great' | 'ok' | 'warm' | 'hot' | 'scorching' | 'cold' | 'freezing' | 'rain';

export type DogWeatherAdvice = {
  tempC: number;
  feelsLikeC: number;
  weatherEmoji: string;
  weatherLabel: string;
  mood: DogWeatherMood;
  headline: string;
  detail: string;
  walkHint: string;
  avoidNow: boolean;
  tipId: string;
};

export type DogWeatherSlotKind = 'now' | 'block' | 'day';

export type DogWeatherSlot = DogWeatherAdvice & {
  id: string;
  kind: DogWeatherSlotKind;
  label: string;
  shortLabel: string;
};

export type DogWeatherBundle = {
  lat: number;
  lng: number;
  slots: DogWeatherSlot[];
};

const TIPS: Record<string, DogTipArticle> = {
  'weather-great': {
    id: 'weather-great',
    title: 'Perfektes Gassi-Wetter',
    emoji: '🐾',
    lead: 'Die Pfoten sagen ja — du auch.',
    sections: [
      {
        body: 'Bei milden Temperaturen (ca. 10–22 °C) können die meisten Hunde entspannt laufen. Trotzdem Wasser mitnehmen, besonders bei längeren Runden.',
      },
      {
        heading: 'Kurz & knackig',
        body: 'Lieber öfter kurz raus als selten sehr lang — besonders für ältere Hunde, Welpen und Bulldoggen-Rassen.',
      },
    ],
  },
  'weather-warm': {
    id: 'weather-warm',
    title: 'Warm — aber machbar',
    emoji: '🌤️',
    lead: 'Nicht zu heiß, nicht zu kalt — mit Köpfchen.',
    sections: [
      {
        body: 'Ab ca. 24 °C wird es für manche Hunde anstrengend. Schattige Wege wählen, Tempo runter, Wasser nicht vergessen.',
      },
      {
        heading: 'Asphalt-Check',
        body: 'Hand 5 Sekunden auf den Boden: zu heiß für deine Hand = zu heiß für Pfoten. Wiesen und Erde sind freundlicher.',
      },
      {
        heading: 'Gute Zeiten',
        body: 'Morgens früh und abends spät sind Gold wert — die Nase freut sich, die Hitze nicht.',
      },
    ],
  },
  'weather-hot': {
    id: 'weather-hot',
    title: 'Zu heiß für die Pfoten',
    emoji: '🥵',
    lead: 'Lieber Couch-Nase als Hitzschlag.',
    sections: [
      {
        body: 'Ab etwa 26–28 °C steigt das Risiko für Hitzschlag und verbrannte Pfotenballen deutlich. Kurzhaar oder Doppelcoat — alle profitieren von Schatten und Pausen.',
      },
      {
        heading: 'Wann wieder raus?',
        body: 'Oft erst abends, wenn die Sonne tiefer steht und die Luft unter ~24 °C fällt. Manchmal auch nur ganz kurz in den Schatten.',
      },
      {
        heading: 'Warnzeichen',
        body: 'Hecheln ohne Pause, taumeln, zähes Speicheln, Apathie — sofort kühlen (nasse Pfoten, Schatten, Wasser) und Tierarzt bei Zweifel.',
      },
    ],
  },
  'weather-scorching': {
    id: 'weather-scorching',
    title: 'Hitzewelle — Pfoten bleiben drinnen',
    emoji: '🔥',
    lead: 'Heute ist Indoor-Schnüffeln angesagt.',
    sections: [
      {
        body: 'Über 30 °C ist aktives Gassi für die meisten Hunde gefährlich. Nur dringende Geschäftchen im Schatten, barfuß nie auf heißem Asphalt.',
      },
      {
        heading: 'Kühlen statt joggen',
        body: 'Nasse Handtücher, Kinderpool, Schatten — Gehirnarbeit indoor statt Kilometer laufen.',
      },
    ],
  },
  'heat-no-ventilator': {
    id: 'heat-no-ventilator',
    title: 'Ventilator ≠ Hunde-Kühlung',
    emoji: '🌀',
    lead: 'Was bei uns kühlt, bringt Hunden oft wenig — manchmal sogar Stress.',
    sections: [
      {
        heading: 'Warum es bei Menschen hilft',
        body: 'Wir schwitzen über fast die ganze Haut. Ein Ventilator (oder Luftzug) trocknet den Schweiß schneller ab — Verdunstung kühlt. Das ist unser Haupt-Kühlsystem.',
      },
      {
        heading: 'Warum Hunde anders sind',
        body: 'Hunde schwitzen fast nur an den Pfotenballen. Die eigentliche Kühlung läuft über Hecheln: feuchte Zunge, schnellere Atmung, Wärme abgeben. Trockene Hitze in die Nase zu blasen, kühlt nicht wie bei uns — es kann eher austrocknen und stressen.',
      },
      {
        heading: 'Im Auto',
        body: 'Klimaanlage kühlt die Luft im Innenraum — das kann helfen, wenn der Hund nicht im direkten Kaltluftstrahl sitzt und genug Wasser da ist. Ein normaler Ventilator im stehenden Auto ersetzt keine Klima. Nie allein lassen — auch „nur kurz“ wird schnell lebensgefährlich.',
      },
      {
        heading: 'Zu Hause',
        body: 'Ventilator plus feuchte Handtücher auf dem Boden, kühle Matten und Schatten sind sinnvoller als „Luft anbläsern und hoffen, es klappt schon“. Bei Hitzestress: sofort runter mit Tempo und kühlen.',
      },
    ],
  },
  'heat-cool-tips': {
    id: 'heat-cool-tips',
    title: 'Hund bei Hitze kühlen',
    emoji: '💧',
    lead: 'Langsam runterdrehen, clever kühlen — nicht schocken.',
    sections: [
      {
        heading: 'Timing',
        body: 'Morgens früh und abends spät sind die freundlichsten Fenster. Mittags lieber drinnen oder im tiefen Schatten — Asphalt-Test: Hand 5 Sekunden auf den Boden, zu heiß = Pfoten bleiben drauf.',
      },
      {
        heading: 'Wasser & Pfoten',
        body: 'Immer Wasser mitnehmen. Pfoten in flachem, kühlem Wasser (Teich, Bach, nasse Wiese) sind Gold wert. Kein eiskaltes Wasser über den ganzen Körper schütten — das kann Schock bedeuten.',
      },
      {
        heading: 'Schatten & Untergrund',
        body: 'Waldwege, hohes Gras, Erde statt glühender Straße. Unterlage mit kühler Decke oder nasser Matte, wenn ihr pausiert.',
      },
      {
        heading: 'Warnzeichen',
        body: 'Starkes Hecheln, Taumeln, breiter Stand, zähes Speicheln, Apathie — abbrechen, Schatten, kühles Wasser, ggf. Tierarzt.',
      },
    ],
  },
  'heat-asphalt': {
    id: 'heat-asphalt',
    title: 'Heißer Asphalt & Pfoten',
    emoji: '🐾',
    lead: 'Bitumen kann Pfoten verbrennen, bevor du es merkst.',
    sections: [
      {
        body: 'Asphalt speichert Hitze. Pfotenballen sind emp emp emp emp und haben wenig Schutz. Lieber Wiesen, Waldrand oder Schotter — oder Schuhe, wenn dein Hund sie toleriert.',
      },
    ],
  },
  'weather-cold': {
    id: 'weather-cold',
    title: 'Frostig — Pfoten schützen',
    emoji: '🧣',
    lead: 'Die Nase funktioniert, der Boden sticht.',
    sections: [
      {
        body: 'Unter 0 °C können Straßenstreusalz und Kälte die Pfoten reizen. Kürzere Runden, danach Pfoten abwaschen.',
      },
      {
        heading: 'Kleine & dünne Hunde',
        body: 'Welpen, Senioren und kurzhaarige Rassen frieren schneller — Mantel kann helfen, muss aber passen.',
      },
    ],
  },
  'weather-freezing': {
    id: 'weather-freezing',
    title: 'Eiskalt — kurz & flauschig',
    emoji: '❄️',
    lead: 'Lieber drei Mini-Runden als eine Eis-Tour.',
    sections: [
      {
        body: 'Unter −5 °C nur kurze Ausflüge. Frostbeulen an Pfoten und Ohren sind real — danach warm trocknen.',
      },
    ],
  },
  'weather-rain': {
    id: 'weather-rain',
    title: 'Regen & Pfoten',
    emoji: '🌧️',
    lead: 'Nasse Nase ist okay — nasse Pfoten auch.',
    sections: [
      {
        body: 'Viele Hunde mögen Regen gar nicht — kürzere Runden reichen. Danach abtrocknen, besonders zwischen den Zehen.',
      },
    ],
  },
  brutzeit: {
    id: 'brutzeit',
    title: 'Brut- & Setzzeit',
    emoji: '🐦',
    lead: 'März bis Juli: Bodenbrüter brauchen Abstand.',
    sections: [
      {
        body: 'In Wiesen, Feldrändern und Hecken brüten Vögel am Boden. Freilaufende Hunde stören oder gefährden Gelege — auch wenn deiner „nur schnüffelt“.',
      },
      {
        heading: 'Was tun?',
        body: 'Leine in sensiblen Bereichen, Wege bleiben, Wiesen meiden. Das gilt oft bis Juli — je nach Region und Vogelart.',
      },
      {
        heading: 'Rechtliches',
        body: 'Naturschutz und Jagdgesetze variieren — im Zweifel Leine dran und Schildern folgen.',
      },
    ],
  },
  weidezeit: {
    id: 'weidezeit',
    title: 'Weidezeit',
    emoji: '🐄',
    lead: 'Kühe mögen keinen Überraschungsbesuch.',
    sections: [
      {
        body: 'April bis November weiden oft Kühe, Schafe oder Pferde. Hunde können Herden verunsichern — Muttertiere schützen ihre Jungen.',
      },
      {
        heading: 'Sicher gehen',
        body: 'Hund an der Leine, Abstand halten, Hundekegel beachten. Bei Mutterkuh mit Kalb besonders vorsichtig.',
      },
    ],
  },
  giftkoeder: {
    id: 'giftkoeder',
    title: 'Giftköder & Köderfallen',
    emoji: '☠️',
    lead: 'Nicht alles auf dem Boden ist ein Snack.',
    sections: [
      {
        body: 'Leckerli-artige Köder mit Gift werden absichtlich ausgelegt — oft in Wäldern und an Wegrändern. Sofort weg, nicht anfassen, melden.',
      },
      {
        heading: 'Notfall',
        body: 'Fressen vermutet? Sofort Tierarzt oder Giftnotruf — Reste mitnehmen, nicht selbst Erbrechen auslösen ohne Anweisung.',
      },
    ],
  },
  leine: {
    id: 'leine',
    title: 'Leinenpflicht & Rücksicht',
    emoji: '🦮',
    lead: 'Manchmal frei, manchmal Pflicht — Schilder lesen.',
    sections: [
      {
        body: 'Leinenpflicht schützt Wild, andere Hunde und Menschen. OSM und Schilder vor Ort können abweichen — im Zweifel Leine.',
      },
    ],
  },
  nachbar: {
    id: 'nachbar',
    title: 'Hinweise von anderen Haltern',
    emoji: '📣',
    lead: 'Community-Meldungen ernst nehmen.',
    sections: [
      {
        body: 'OpenStreetMap Notes und Meldungen stammen von Menschen vor Ort. Nicht alles ist verifiziert — aber Vorsicht schadet selten.',
      },
    ],
  },
  hinweis: {
    id: 'hinweis',
    title: 'Allgemeine Vorsicht',
    emoji: '⚠️',
    lead: 'Lieber einmal mehr gucken.',
    sections: [
      {
        body: 'Baustellen, Umleitungen, aggressive Hunde, Glasscherben — die Nase findet alles. Leine und Aufmerksamkeit helfen.',
      },
    ],
  },
  'spot-wald': {
    id: 'spot-wald',
    title: 'Wald mit Hund',
    emoji: '🌲',
    lead: 'Schattig, spannend — und voller Fallen für die Nase.',
    sections: [
      {
        body: 'Im Wald treffen Wild, Wege und manchmal Weidevieh aufeinander. Leine in sensiblen Abschnitten, Zecken nach der Runde checken.',
      },
      {
        heading: 'Saison beachten',
        body: 'April bis November Weidezeit, März bis Juli Brutzeit an Waldrändern — Abstand zu Feldern und Wiesen.',
      },
    ],
  },
  'spot-wiese': {
    id: 'spot-wiese',
    title: 'Wiese & Freilauf',
    emoji: '🌿',
    lead: 'Toben ja — aber nicht überall.',
    sections: [
      {
        body: 'Offene Wiesen locken zum Apportieren. Von März bis Juli brüten oft Bodenvögel — dann Leine oder Rand der Wiese meiden.',
      },
    ],
  },
  'spot-hundewiese': {
    id: 'spot-hundewiese',
    title: 'Hundewiese',
    emoji: '🐕',
    lead: 'Freilauf — mit Augenmaß.',
    sections: [
      {
        body: 'Eingezäunte Flächen sind ideal zum Auspowern. Impfungen aktuell halten, Wasser mitbringen, bei Hitzestress lieber morgens.',
      },
      {
        heading: 'Fair spielen',
        body: 'Nicht jeder Hund will Kontakt — Rückruf und Abstand zu unsicheren Vierbeinern.',
      },
    ],
  },
  'spot-hundestrand': {
    id: 'spot-hundestrand',
    title: 'Hundestrand',
    emoji: '🏖️',
    lead: 'Salz, Sand und Wellen.',
    sections: [
      {
        body: 'Nach dem Baden frisches Wasser anbieten — Salzwasser darf nicht zum Durstlöschen dienen. Pfoten und Ohren abspülen.',
      },
    ],
  },
  'spot-park': {
    id: 'spot-park',
    title: 'Park in der Stadt',
    emoji: '🌳',
    lead: 'Grün mitten in der Menge.',
    sections: [
      {
        body: 'An Spielplätzen, Alleen und dichten Begegnungszonen Leine. Kotbeutel mitnehmen — Parks leben von Rücksicht.',
      },
    ],
  },
  'spot-spazierweg': {
    id: 'spot-spazierweg',
    title: 'Spazier- & Wanderweg',
    emoji: '🥾',
    lead: 'Schön lang — gut schnüffeln.',
    sections: [
      {
        body: 'Markierte Wege respektieren, Wegekreuzungen mit Weideflächen vorsichtig angehen. Wasser und Pausen einplanen.',
      },
    ],
  },
};

export function getDogTip(id: string): DogTipArticle | null {
  return TIPS[id] ?? null;
}

export function tipIdForSpot(kind: DogSpotKind): string {
  return `spot-${kind}`;
}

export function tipIdForAlert(kind: DogAlertKind, alertId?: string): string {
  if (alertId === 'season-brut') return 'brutzeit';
  if (alertId === 'season-weide') return 'weidezeit';
  switch (kind) {
    case 'giftkoeder':
      return 'giftkoeder';
    case 'brutzeit':
      return 'brutzeit';
    case 'leine':
      return 'leine';
    case 'nachbar':
      return 'nachbar';
    default:
      return 'hinweis';
  }
}

export function tipIdForLeashMonth(month: number): string {
  if (month >= 3 && month <= 7) return 'brutzeit';
  if (month >= 4 && month <= 11) return 'weidezeit';
  return 'weather-great';
}

const HEADLINES: Record<DogWeatherMood, string[]> = {
  great: [
    'Pfoten-Jackpot — heute riecht alles nach Abenteuer!',
    'Gassi-Wetter: Die Nase gibt grünes Licht.',
    'Temperatur? *Chef’s kiss* — raus mit euch!',
    'Heute dürfen die Ohren im Wind flattern.',
  ],
  ok: [
    'Geht klar — mit Wasser und Schatten-Pause.',
    'Nicht zu heiß, nicht zu kalt — normale Nase.',
    'Solides Gassi-Wetter. Tempo nach Hund.',
    'Alles im grünen Bereich — schnüffeln erlaubt.',
  ],
  warm: [
    'Wird warm — Schatten ist jetzt Premium-Platz.',
    'Die Pfoten sagen: lieber kürzer und schattiger.',
    'Fast perfekt — aber nicht in der Mittagssonne sprinten.',
    'Warm genug, dass Wasser Pflichtprogramm ist.',
  ],
  hot: [
    'Zu heiß für Tapeten-Nase — Asphalt backt Pfoten!',
    'Die Sonne meint es ernst. Couch oder Schatten?',
    'Hitzewarnung: Pfoten bleiben lieber drinnen.',
    'Aktuell: Eiswürfel-Wetter, kein Marathon-Wetter.',
  ],
  scorching: [
    'Hitzewelle! Selbst der Schatten schwitzt.',
    'Nur noch Notfall-Gassi — und das im Schatten.',
    'Zu heiß. Die Nase verträgt das nicht.',
    'Brandheiß — Indoor-Schnüffel-Training statt Runde.',
  ],
  cold: [
    'Frostig — kurze Runden, warme Pfoten danach.',
    'Die Nase läuft, die Ohren frieren vielleicht.',
    'Kalt draußen — Mantel? Salz auf dem Weg?',
    'Wintermodus: weniger Kilometer, mehr Kuscheln.',
  ],
  freezing: [
    'Eiskalt! Mini-Runde, dann zurück unter die Decke.',
    'Pfoten sagen: drei Schritte reichen.',
    'Frostalarm — barfuß wärst du auch nicht lange draußen.',
    'Nur das Nötigste — danach Pfoten trocken.',
  ],
  rain: [
    'Regen — nasse Nase ist okay, nasse Couch nicht.',
    'Schirm für dich, Geduld für den Hund.',
    'Pfoten werden matschig — Handtuch bereithalten.',
    'Draußen riecht’s super — drinnen wird gewischt.',
  ],
};

const DETAILS: Record<DogWeatherMood, string[]> = {
  great: [
    'Temperatur ist hundegerecht — lange Runden kein Problem, wenn deiner fit ist.',
    'Ideal für Schnüffelspaziergänge. Wasser trotzdem mitnehmen!',
  ],
  ok: [
    'Alles im Rahmen — auf ältere Hunde und Brachycephalen (kurze Schnauze) achten.',
    'Guter Tag für eine normale Runde.',
  ],
  warm: [
    'Mittagssonne meiden — morgens oder abends ist angenehmer.',
    'Hand auf Asphalt: zu heiß? Dann Pfoten schonen.',
  ],
  hot: [
    'Hitzschlag-Risiko steigt. Kein Sport, kein Ball auf heißem Boden.',
    'Lieber warten, bis es abkühlt — siehe Uhrzeit unten.',
  ],
  scorching: [
    'Für die meisten Hunde gefährlich heiß. Nur dringend im Schatten.',
    'Kühle Erde > heißer Asphalt. Punkt.',
  ],
  cold: [
    'Salz und Kälte reizen Pfoten — danach abwaschen.',
    'Kürzer raus, öfter — besonders bei kleinen Rassen.',
  ],
  freezing: [
    'Unter −5 °C nur Kurzprogramm. Ohren und Pfoten beobachten.',
    'Welpens und Senioren frieren schneller.',
  ],
  rain: [
    'Manche lieben’s, manche nicht — Tempo anpassen.',
    'Nach dem Regen riecht’s doppelt gut — aber Handtuch!',
  ],
};

export function pickVariant<T>(items: readonly T[], seed: number): T {
  return items[Math.abs(seed) % items.length];
}

export function weatherSeed(lat: number, lng: number, day: number): number {
  return Math.floor(lat * 1000 + lng * 700 + day * 13);
}

export { HEADLINES as WEATHER_HEADLINES, DETAILS as WEATHER_DETAILS };
