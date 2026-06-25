import { WS_BUSINESS, WS_BUSINESS_ADDRESS_LINE } from './ws-business';
import type { WsOrder } from './weisser-schaefer.data';
import { wsOrderCustomerStatusLabel } from './weisser-schaefer.data';

export type WsOrderStatusNotification = {
  id: string;
  orderId: string;
  customerCompany: string;
  customerEmail: string;
  status: WsOrder['status'];
  statusLabel: string;
  subject: string;
  html: string;
  sentAt: string;
};

export const WS_ORDER_NOTIFICATIONS_KEY = 'ws-order-notifications';

function emailLogoUrl(): string {
  if (typeof window === 'undefined') {
    return '/ws-label-logo.png';
  }
  return `${window.location.origin}/ws-label-logo.png`;
}

function formatOrderDate(createdAt: string): string {
  return new Date(createdAt).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusEmailCopy(order: WsOrder): { headline: string; lead: string } {
  switch (order.status) {
    case 'neu':
      return {
        headline: 'Bestellung eingegangen',
        lead: 'Vielen Dank — Ihre Bestellung ist bei uns eingegangen und wird bearbeitet.',
      };
    case 'in Bearbeitung':
      return {
        headline: 'Bestellung in Bearbeitung',
        lead: 'Gute Nachrichten: Wir bearbeiten Ihre Bestellung derzeit in unserem Haus.',
      };
    case 'versendet':
      return {
        headline: 'Bestellung versendet',
        lead: 'Ihre Bestellung wurde versendet. Wir wünschen Ihnen guten Appetit und viel Erfolg bei der Weiterverarbeitung.',
      };
  }
}

function statusAccentColor(status: WsOrder['status']): string {
  switch (status) {
    case 'neu':
      return '#8a9a3c';
    case 'in Bearbeitung':
      return '#a8843a';
    case 'versendet':
      return '#4a8f5c';
  }
}

function renderLinesHtml(lines: WsOrder['lines']): string {
  return lines
    .map(
      (line) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #ebe6da;font-size:14px;color:#2a2c28;">
            <strong style="font-weight:600;">${line.qty}×</strong> ${escapeHtml(line.name)}
            ${line.unit ? `<span style="color:#6b6e66;"> (${escapeHtml(line.unit)})</span>` : ''}
          </td>
        </tr>`,
    )
    .join('');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildOrderStatusEmail(params: {
  order: WsOrder;
  customerEmail: string;
  accountUrl: string;
}): WsOrderStatusNotification {
  const { order, customerEmail, accountUrl } = params;
  const statusLabel = wsOrderCustomerStatusLabel(order);
  const copy = statusEmailCopy(order);
  const accent = statusAccentColor(order.status);
  const sentAt = new Date().toISOString();
  const subject = `${copy.headline} · Bestellung ${order.id}`;

  const noteBlock = order.note
    ? `<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#4a4d46;font-style:italic;">
        Hinweis: ${escapeHtml(order.note)}
      </p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#ece8df;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ece8df;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#faf8f2;border:1px solid #ddd6c8;border-radius:12px;overflow:hidden;box-shadow:0 12px 40px rgba(26,28,24,0.08);">
          <tr>
            <td style="padding:28px 32px 20px;text-align:center;background:linear-gradient(180deg,#f5f2ea 0%,#faf8f2 100%);border-bottom:1px solid #ebe6da;">
              <img src="${emailLogoUrl()}" alt="${escapeHtml(WS_BUSINESS.brand)}" width="168" style="display:block;margin:0 auto 14px;max-width:168px;height:auto;" />
              <p style="margin:0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#7a7d74;">${escapeHtml(WS_BUSINESS.tagline)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px;">
              <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#8a8d84;">Statusupdate</p>
              <h1 style="margin:0 0 14px;font-size:26px;font-weight:500;line-height:1.2;color:#1a1c18;">${escapeHtml(copy.headline)}</h1>
              <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#4a4d46;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(copy.lead)}</p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:22px;">
                <tr>
                  <td style="padding:8px 14px;border-radius:999px;background:${accent}18;border:1px solid ${accent}55;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${accent};">
                    ${escapeHtml(statusLabel)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff;border:1px solid #ebe6da;border-radius:10px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#8a8d84;text-transform:uppercase;letter-spacing:0.08em;">Bestellung</p>
                    <p style="margin:0 0 2px;font-size:18px;font-weight:700;color:#1a1c18;">${escapeHtml(order.id)}</p>
                    <p style="margin:0 0 16px;font-size:13px;color:#6b6e66;">${escapeHtml(order.customer)} · ${formatOrderDate(order.createdAt)}</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      ${renderLinesHtml(order.lines)}
                    </table>
                    ${noteBlock}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;text-align:center;">
              <a href="${escapeHtml(accountUrl)}" style="display:inline-block;padding:13px 28px;border-radius:999px;background:linear-gradient(135deg,#dce88a,#a8b84a);color:#1a1c18;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;text-decoration:none;">
                Bestellung im Konto ansehen
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 32px 28px;border-top:1px solid #ebe6da;background:#f3f0e8;font-family:Arial,Helvetica,sans-serif;text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#1a1c18;">${escapeHtml(WS_BUSINESS.brand)}</p>
              <p style="margin:0 0 4px;font-size:12px;line-height:1.55;color:#6b6e66;">${escapeHtml(WS_BUSINESS_ADDRESS_LINE)}</p>
              <p style="margin:0;font-size:12px;line-height:1.55;color:#6b6e66;">
                Tel. ${escapeHtml(WS_BUSINESS.phoneDisplay)} ·
                <a href="mailto:${escapeHtml(WS_BUSINESS.email)}" style="color:#6b6e66;">${escapeHtml(WS_BUSINESS.email)}</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8a8d84;">
          Diese Nachricht wurde automatisch an ${escapeHtml(customerEmail)} gesendet.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    id: `mail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    orderId: order.id,
    customerCompany: order.customer,
    customerEmail,
    status: order.status,
    statusLabel,
    subject,
    html,
    sentAt,
  };
}

export function loadOrderNotifications(): WsOrderStatusNotification[] {
  try {
    const raw = localStorage.getItem(WS_ORDER_NOTIFICATIONS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as WsOrderStatusNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOrderNotifications(items: WsOrderStatusNotification[]): void {
  localStorage.setItem(WS_ORDER_NOTIFICATIONS_KEY, JSON.stringify(items));
}
