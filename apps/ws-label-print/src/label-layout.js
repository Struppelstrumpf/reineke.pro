const { WS_BUSINESS, WS_BUSINESS_CONTACT_LINES } = require('./business');

const LABEL_ITEMS_PER_PAGE = 8;

function chunkArray(items, size) {
  if (!items.length) {
    return [[]];
  }
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function formatLabelDate(payload) {
  return payload.createdAt
    ? new Date(payload.createdAt).toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

function formatOrderLine(line) {
  const unit = line.unit ? ` (${line.unit})` : '';
  return `${line.qty}× ${line.name}${unit}`;
}

function splitAddressLines(addressRaw) {
  const source = String(addressRaw || '').trim();
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

function buildPageHeader(payload, index) {
  const orderId = payload.orderId || 'TEST';
  const date = formatLabelDate(payload);
  const address = splitAddressLines(payload.customerAddress);
  const customerPhone = String(payload.customerPhone || '').trim() || 'Telefon nicht hinterlegt';
  const lines = [
    { style: 'logo', text: '' },
    { style: 'meta', text: WS_BUSINESS.tagline },
  ];

  const orderTitle = index === 0 ? `Bestellung ${orderId}` : `Bestellung ${orderId} (Fortsetzung)`;
  lines.push(
    { style: 'subtitle', text: orderTitle },
    { style: 'body', text: payload.customer || '-' },
    { style: 'meta', text: address.street },
    { style: 'meta', text: address.city },
    { style: 'meta', text: `Tel. ${customerPhone}` },
    { style: 'spacer', text: '' },
    { style: 'meta', text: `Datum/Uhrzeit: ${date}` },
    { style: 'spacer', text: '' },
    { style: 'itemHeading', text: 'BESTELLTE ARTIKEL' },
  );

  return lines;
}

function buildPageFooter(payload, index, totalPages) {
  const orderId = payload.orderId || 'TEST';
  const lines = [];

  if (payload.note && index === totalPages - 1) {
    lines.push({ style: 'meta', text: `Hinweis: ${payload.note}` });
  }

  lines.push({ style: 'divider', text: '' });

  for (const contact of WS_BUSINESS_CONTACT_LINES) {
    lines.push({ style: 'contact', text: contact });
  }

  if (totalPages > 1) {
    lines.push({ style: 'page', text: `Seite ${index + 1} von ${totalPages}` });
  }

  lines.push({ style: 'barcode', text: `|||| ${orderId} ||||` });
  return lines;
}

function buildLabelPages(payload) {
  const productLines = payload.lines || [];
  const chunks = chunkArray(productLines, LABEL_ITEMS_PER_PAGE);
  const totalPages = chunks.length;

  return chunks.map((chunk, index) => ({
    lines: [
      ...buildPageHeader(payload, index),
      ...chunk.map((line) => ({ style: 'item', text: formatOrderLine(line) })),
      ...buildPageFooter(payload, index, totalPages),
    ],
  }));
}

module.exports = {
  LABEL_ITEMS_PER_PAGE,
  buildLabelPages,
};
