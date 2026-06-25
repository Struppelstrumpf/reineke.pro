import { WS_BUSINESS, WS_BUSINESS_CONTACT_LINES } from './ws-business';
import type { WsLabelLine } from './ws-label-layout';
import type { WsStockAlertItem, WsStockAlertPrintPayload } from './ws-stock-alert.types';

function formatNow(): string {
  return new Date().toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildStockAlertNote(item: WsStockAlertItem): string {
  return `${item.productName} · nur noch ${item.quantity}× ${item.unit} (Schwelle ${item.threshold})`;
}

export function buildStockAlertLabelPages(payload: WsStockAlertPrintPayload): WsLabelLine[][] {
  const items = payload.items;
  if (!items.length) {
    return [[]];
  }

  const lines: WsLabelLine[] = [
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
      { style: 'meta', text: item.spec },
    );
  }

  lines.push(
    { style: 'divider', text: '' },
    ...WS_BUSINESS_CONTACT_LINES.map((text) => ({ style: 'contact' as const, text })),
    {
      style: 'barcode',
      text: `|||| LAGER-${items.map((item) => item.productId).join('+')} ||||`,
    },
  );

  return [lines];
}
