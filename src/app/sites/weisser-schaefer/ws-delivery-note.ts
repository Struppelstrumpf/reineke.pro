import { WS_BUSINESS } from './ws-business';
import type { WsOrder } from './weisser-schaefer.data';

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(createdAt: string): string {
  return new Date(createdAt).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function splitAddress(raw: string | undefined): { street: string; city: string } {
  const source = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!source) {
    return { street: '', city: '' };
  }
  const parts = source.split(/[\n,;]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { street: parts[0], city: parts.slice(1).join(', ') };
  }
  const plz = source.match(/^(.*?)(\d{5}\s+.+)$/);
  if (plz) {
    return { street: plz[1].trim(), city: plz[2].trim() };
  }
  return { street: source, city: '' };
}

function rowsHtml(order: WsOrder): string {
  return order.lines
    .map(
      (line) => `
      <tr>
        <td class="qty">${escapeHtml(String(line.qty))}</td>
        <td>${escapeHtml(line.name)}${line.unit ? ` <span class="unit">(${escapeHtml(line.unit)})</span>` : ''}</td>
      </tr>`,
    )
    .join('');
}

function noteHtml(order: WsOrder): string {
  if (!order.note) {
    return '';
  }
  return `<p class="note"><strong>Hinweis:</strong> ${escapeHtml(order.note)}</p>`;
}

function pageHtml(order: WsOrder): string {
  const address = splitAddress(order.customerAddress);
  const phone = (order.customerPhone ?? '').trim();
  return `
  <section class="sheet">
    <header class="head">
      <div class="brand">
        <h1>${escapeHtml(WS_BUSINESS.brandPrint)}</h1>
        <p>${escapeHtml(WS_BUSINESS.tagline)}</p>
        <p class="sender">${escapeHtml(WS_BUSINESS.street)} · ${escapeHtml(WS_BUSINESS.zip)} ${escapeHtml(WS_BUSINESS.city)}</p>
        <p class="sender">Tel. ${escapeHtml(WS_BUSINESS.phoneDisplay)} · ${escapeHtml(WS_BUSINESS.email)}</p>
      </div>
      <div class="docmeta">
        <h2>Lieferschein</h2>
        <p><strong>Nr.:</strong> ${escapeHtml(order.id)}</p>
        <p><strong>Datum:</strong> ${escapeHtml(formatDate(order.createdAt))}</p>
      </div>
    </header>

    <div class="address-block">
      <p class="label">Lieferanschrift</p>
      <p class="company">${escapeHtml(order.customer)}</p>
      ${address.street ? `<p>${escapeHtml(address.street)}</p>` : ''}
      ${address.city ? `<p>${escapeHtml(address.city)}</p>` : ''}
      ${phone ? `<p>Tel. ${escapeHtml(phone)}</p>` : ''}
    </div>

    <table class="items">
      <thead>
        <tr><th class="qty">Menge</th><th>Artikel</th></tr>
      </thead>
      <tbody>
        ${rowsHtml(order)}
      </tbody>
    </table>

    ${noteHtml(order)}

    <div class="sign">
      <div class="sign-box">
        <span>Datum / Unterschrift Fahrer</span>
      </div>
      <div class="sign-box">
        <span>Datum / Unterschrift Empfänger</span>
      </div>
    </div>

    <footer class="foot">
      <span>${escapeHtml(WS_BUSINESS.brand)}</span>
      <span>${escapeHtml(WS_BUSINESS.web)}</span>
    </footer>
  </section>`;
}

export function buildDeliveryNoteHtml(orders: WsOrder[]): string {
  const pages = orders.map((order) => pageHtml(order)).join('');
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Lieferschein${orders.length === 1 ? ` ${escapeHtml(orders[0].id)}` : 'e'}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #1a1c18; background: #fff; }
    .sheet {
      width: 210mm;
      min-height: 297mm;
      padding: 18mm 16mm;
      margin: 0 auto;
      page-break-after: always;
      display: flex;
      flex-direction: column;
    }
    .sheet:last-child { page-break-after: auto; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1c18; padding-bottom: 10px; }
    .brand h1 { margin: 0; font-size: 22px; letter-spacing: 2px; }
    .brand p { margin: 2px 0 0; font-size: 11px; color: #555; }
    .brand .sender { font-size: 10px; color: #777; }
    .docmeta { text-align: right; }
    .docmeta h2 { margin: 0 0 6px; font-size: 20px; }
    .docmeta p { margin: 2px 0; font-size: 12px; }
    .address-block { margin-top: 26px; }
    .address-block .label { margin: 0 0 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; }
    .address-block p { margin: 1px 0; font-size: 13px; }
    .address-block .company { font-size: 15px; font-weight: 700; }
    table.items { width: 100%; border-collapse: collapse; margin-top: 26px; }
    table.items th { text-align: left; border-bottom: 1.5px solid #1a1c18; padding: 8px 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    table.items td { padding: 8px 6px; border-bottom: 1px solid #ddd; font-size: 13px; }
    table.items .qty { width: 70px; text-align: center; font-weight: 700; }
    table.items th.qty { text-align: center; }
    .unit { color: #777; }
    .note { margin-top: 18px; font-size: 12px; font-style: italic; color: #444; }
    .sign { margin-top: auto; display: flex; gap: 30px; padding-top: 40px; }
    .sign-box { flex: 1; border-top: 1px solid #1a1c18; padding-top: 6px; font-size: 10px; color: #777; }
    .foot { display: flex; justify-content: space-between; margin-top: 18px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 10px; color: #999; }
    @page { size: A4; margin: 0; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  ${pages}
  <script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 200); });</script>
</body>
</html>`;
}
