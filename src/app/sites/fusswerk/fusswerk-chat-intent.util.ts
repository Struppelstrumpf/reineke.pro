import type { FwChatTemplateId } from './fusswerk-chat.types';

function normalizeForIntent(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

/** Erkennt Preis- und Öffnungszeiten-Fragen von Gästen. */
export function detectAutoReplyTemplates(text: string): FwChatTemplateId[] {
  const t = normalizeForIntent(text);
  const found = new Set<FwChatTemplateId>();

  if (
    /\b(preis|preise|preisliste|kosten|kostet|kostenlos|teuer|gebuehr|tarif)\b/.test(t) ||
    /was kostet/.test(t) ||
    /wie viel/.test(t)
  ) {
    found.add('preise');
  }

  if (
    /\b(oeffnungszeit|oeffnungszeiten|geoeffnet|sprechzeit)\b/.test(t) ||
    /wann (haben|habt|sind|ist).*(offen|geoeffnet)/.test(t) ||
    /habt ihr offen/.test(t) ||
    /heute offen/.test(t) ||
    /wann offen/.test(t)
  ) {
    found.add('hours');
  }

  return [...found];
}
