const { WS_BUSINESS, WS_BUSINESS_CONTACT_LINES } = require('./business');

function formatNow() {
  return new Date().toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildStockAlertNote(item) {
  return `${item.productName} · nur noch ${item.quantity}× ${item.unit} (Schwelle ${item.threshold})`;
}

function buildStockAlertLabelPages(payload) {
  const items = Array.isArray(payload.items) ? payload.items : payload.productId ? [payload] : [];
  if (!items.length) {
    return [{ lines: [] }];
  }

  const lines = [
    { style: 'logo', text: '' },
    { style: 'meta', text: WS_BUSINESS.tagline },
    { style: 'subtitle', text: 'Lagerwarnung' },
    {
      style: 'meta',
      text: `${items.length} Produkt${items.length === 1 ? '' : 'e'} unter Schwelle · ${formatNow()}`,
    },
    { style: 'divider', text: '' },
  ];

  for (const item of items) {
    lines.push(
      { style: 'item', text: buildStockAlertNote(item) },
      { style: 'meta', text: item.spec || '' },
    );
  }

  lines.push(
    { style: 'divider', text: '' },
    ...WS_BUSINESS_CONTACT_LINES.map((text) => ({ style: 'contact', text })),
    {
      style: 'barcode',
      text: `|||| LAGER-${items.map((item) => item.productId || 'X').join('+')} ||||`,
    },
  );

  return [{ lines }];
}

module.exports = {
  buildStockAlertLabelPages,
  buildStockAlertNote,
};
