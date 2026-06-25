import { WS_BUSINESS, WS_BUSINESS_CONTACT_LINES } from './ws-business';
import type { WsOrder } from './weisser-schaefer.data';

export const WS_LABEL_ITEMS_PER_PAGE = 8;

export type WsLabelLineStyle =
  | 'logo'
  | 'subtitle'
  | 'body'
  | 'itemHeading'
  | 'item'
  | 'spacer'
  | 'meta'
  | 'divider'
  | 'contact'
  | 'page'
  | 'barcode';

export type WsLabelLine = {
  text: string;
  style: WsLabelLineStyle;
};

function chunkLines<T>(items: T[], size: number): T[][] {
  if (!items.length) {
    return [[]];
  }
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function formatLabelDate(createdAt: string): string {
  return new Date(createdAt).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatOrderLine(line: WsOrder['lines'][number]): string {
  const unit = line.unit ? ` (${line.unit})` : '';
  return `${line.qty}× ${line.name}${unit}`;
}

function splitAddressLines(addressRaw: string | undefined): { street: string; city: string } {
  const source = addressRaw?.trim() ?? '';
  if (!source) {
    return { street: 'Straße nicht hinterlegt', city: 'PLZ Ort nicht hinterlegt' };
  }
  const compact = source.replace(/\s+/g, ' ').trim();
  const parts = compact
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return { street: parts[0], city: parts[1] };
  }
  const plzMatch = compact.match(/^(.*?)(\d{5}\s+.+)$/);
  if (plzMatch) {
    return {
      street: plzMatch[1].trim() || 'Straße nicht hinterlegt',
      city: plzMatch[2].trim(),
    };
  }
  return { street: compact, city: 'PLZ Ort nicht hinterlegt' };
}

function buildPageHeader(
  order: Pick<WsOrder, 'id' | 'customer' | 'customerAddress' | 'customerPhone' | 'createdAt' | 'lines'>,
  index: number,
  _chunk: WsOrder['lines'],
): WsLabelLine[] {
  const lines: WsLabelLine[] = [
    { style: 'logo', text: '' },
    { style: 'meta', text: WS_BUSINESS.tagline },
  ];
  const address = splitAddressLines(order.customerAddress);
  const customerPhone = order.customerPhone?.trim() || 'Telefon nicht hinterlegt';
  const orderTitle = index === 0 ? `Bestellung ${order.id}` : `Bestellung ${order.id} (Fortsetzung)`;

  lines.push(
    { style: 'subtitle', text: orderTitle },
    { style: 'body', text: order.customer },
    { style: 'meta', text: address.street },
    { style: 'meta', text: address.city },
    { style: 'meta', text: `Tel. ${customerPhone}` },
    { style: 'spacer', text: '' },
    { style: 'meta', text: `Datum/Uhrzeit: ${formatLabelDate(order.createdAt)}` },
    { style: 'spacer', text: '' },
    { style: 'itemHeading', text: 'BESTELLTE ARTIKEL' },
  );

  return lines;
}

function buildPageFooter(order: Pick<WsOrder, 'id' | 'note'>, index: number, totalPages: number): WsLabelLine[] {
  const lines: WsLabelLine[] = [];

  if (order.note && index === totalPages - 1) {
    lines.push({ style: 'meta', text: `Hinweis: ${order.note}` });
  }

  lines.push({ style: 'divider', text: '' });

  for (const contact of WS_BUSINESS_CONTACT_LINES) {
    lines.push({ style: 'contact', text: contact });
  }

  if (totalPages > 1) {
    lines.push({ style: 'page', text: `Seite ${index + 1} von ${totalPages}` });
  }

  lines.push({ style: 'barcode', text: `|||| ${order.id} ||||` });
  return lines;
}

export function splitWsLabelPageSections(lines: WsLabelLine[]): {
  header: WsLabelLine[];
  items: WsLabelLine[];
  footer: WsLabelLine[];
} {
  const header: WsLabelLine[] = [];
  const items: WsLabelLine[] = [];
  const footer: WsLabelLine[] = [];
  let phase: 'header' | 'items' | 'footer' = 'header';

  for (const line of lines) {
    if (line.style === 'itemHeading' || line.style === 'item') {
      phase = 'items';
    } else if (
      line.style === 'divider' ||
      line.style === 'contact' ||
      line.style === 'barcode' ||
      line.style === 'page'
    ) {
      phase = 'footer';
    }

    if (phase === 'header') {
      header.push(line);
    } else if (phase === 'items') {
      items.push(line);
    } else {
      footer.push(line);
    }
  }

  return { header, items, footer };
}

export function splitWsLabelHeader(header: WsLabelLine[]): {
  brand: WsLabelLine[];
  order: WsLabelLine[];
} {
  const brand: WsLabelLine[] = [];
  const order: WsLabelLine[] = [];

  for (const line of header) {
    if (line.style === 'logo' || (line.style === 'meta' && !order.length)) {
      brand.push(line);
    } else {
      order.push(line);
    }
  }

  return { brand, order };
}

export function buildWsLabelPages(
  order: Pick<WsOrder, 'id' | 'customer' | 'customerAddress' | 'customerPhone' | 'lines' | 'note' | 'createdAt'>,
): WsLabelLine[][] {
  const productLines = order.lines ?? [];
  const chunks = chunkLines(productLines, WS_LABEL_ITEMS_PER_PAGE);

  return chunks.map((chunk, index) => [
    ...buildPageHeader(order, index, chunk),
    ...chunk.map((line) => ({ style: 'item' as const, text: formatOrderLine(line) })),
    ...buildPageFooter(order, index, chunks.length),
  ]);
}
