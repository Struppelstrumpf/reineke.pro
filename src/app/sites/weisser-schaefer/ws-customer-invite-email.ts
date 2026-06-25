import { WS_BUSINESS, WS_BUSINESS_ADDRESS_LINE } from './ws-business';

export type WsCustomerInviteEmail = {
  id: string;
  customerEmail: string;
  subject: string;
  html: string;
  sentAt: string;
  activationUrl: string;
};

export const WS_CUSTOMER_INVITE_NOTIFICATIONS_KEY = 'ws-customer-invite-notifications';

function emailLogoUrl(): string {
  if (typeof window === 'undefined') {
    return '/ws-label-logo.png';
  }
  return `${window.location.origin}/ws-label-logo.png`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildCustomerActivationUrl(email: string, token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const params = new URLSearchParams({ email, token });
  return `${origin}/demo/weisser-schaefer/konto-aktivieren?${params.toString()}`;
}

export function buildCustomerInviteEmail(params: {
  customerEmail: string;
  activationUrl: string;
  invitedByName?: string;
}): WsCustomerInviteEmail {
  const { customerEmail, activationUrl, invitedByName } = params;
  const sentAt = new Date().toISOString();
  const subject = 'Ihr Fleischerei-Konto bei Weißer Schäfer — jetzt aktivieren';
  const inviterLine = invitedByName
    ? `Für Sie wurde von <strong>${escapeHtml(invitedByName)}</strong> ein Zugang eingerichtet.`
    : 'Für Sie wurde ein Zugang bei Weißer Schäfer eingerichtet.';

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
              <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#8a8d84;">Willkommen</p>
              <h1 style="margin:0 0 14px;font-size:26px;font-weight:500;line-height:1.2;color:#1a1c18;">Ihr Kundenkonto wartet auf Sie</h1>
              <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#4a4d46;font-family:Arial,Helvetica,sans-serif;">
                ${inviterLine} Aktivieren Sie Ihr Konto, ergänzen Sie Ihre Kontaktdaten und bestellen Sie anschließend bequem online.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:22px;">
                <tr>
                  <td style="padding:8px 14px;border-radius:999px;background:#8a9a3c18;border:1px solid #8a9a3c55;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#8a9a3c;">
                    Einladung · Aktivierung erforderlich
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
                    <p style="margin:0 0 4px;font-size:12px;color:#8a8d84;text-transform:uppercase;letter-spacing:0.08em;">Nächster Schritt</p>
                    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#4a4d46;">
                      Klicken Sie auf den Button und vervollständigen Sie Ihre Angaben — Fleischerei, Ansprechpartner, Telefonnummer und Passwort.
                    </p>
                    <p style="margin:0;font-size:13px;line-height:1.55;color:#6b6e66;">
                      Nach der Aktivierung ist Ihr Konto sofort freigeschaltet. Sie können direkt bestellen.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;text-align:center;">
              <a href="${escapeHtml(activationUrl)}" style="display:inline-block;padding:14px 30px;border-radius:999px;background:linear-gradient(135deg,#dce88a,#a8b84a);color:#1a1c18;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;text-decoration:none;box-shadow:0 8px 24px rgba(138,154,60,0.25);">
                Kundenkonto aktivieren
              </a>
              <p style="margin:16px 0 0;font-size:12px;line-height:1.55;color:#8a8d84;font-family:Arial,Helvetica,sans-serif;">
                Link ungültig? Antworten Sie einfach auf diese E-Mail — wir helfen Ihnen weiter.
              </p>
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
          Diese Nachricht wurde an ${escapeHtml(customerEmail)} gesendet.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    id: `invite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    customerEmail,
    subject,
    html,
    sentAt,
    activationUrl,
  };
}

export function loadCustomerInviteNotifications(): WsCustomerInviteEmail[] {
  try {
    const raw = localStorage.getItem(WS_CUSTOMER_INVITE_NOTIFICATIONS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as WsCustomerInviteEmail[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomerInviteNotification(email: WsCustomerInviteEmail): void {
  const items = loadCustomerInviteNotifications();
  items.unshift(email);
  localStorage.setItem(WS_CUSTOMER_INVITE_NOTIFICATIONS_KEY, JSON.stringify(items.slice(0, 50)));
}
