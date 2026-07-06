'use strict';

const { encryptBookingPii, decryptBookingPii } = require('./fusswerk-crypto');
const {
  DEFAULT_SETTINGS,
  computeSlots,
  bookingClash,
  isSlotAvailable,
  isValidSlot,
  getServiceDurationMinutes,
} = require('./fusswerk-scheduling');

const FW_BOOKINGS_KEY = 'fw-bookings';
const FW_EMAIL_LOG_KEY = 'fw-email-log';

const FW_OWNER_EMAIL = process.env.FUSSWERK_OWNER_EMAIL || 'hallo@fusswerk-bad-rothenfelde.de';
const FW_ORIGIN = (process.env.FUSSWERK_FRONTEND_ORIGIN || 'http://localhost:4200').replace(/\/$/, '');

const FW_SERVICES = {
  classic: { label: 'Klassische Fußpflege', minutes: 45 },
  medical: { label: 'Medizinische Fußpflege', minutes: 55 },
  wellness: { label: 'Fußbad & Massage', minutes: 30 },
  senior: { label: 'Seniorenpflege', minutes: 50 },
};

function sanitizeText(raw, max = 200) {
  return String(raw ?? '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, max);
}

function sanitizeEmail(raw) {
  return sanitizeText(raw, 254).toLowerCase();
}

function sanitizePhone(raw) {
  return sanitizeText(raw, 32).replace(/[^\d+\s()/-]/g, '');
}

function parseDateOnly(raw) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw || '')) return null;
  const d = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function weekdayIndex(dateStr) {
  return parseDateOnly(dateStr).getDay();
}

const FW_DEFAULT_SCHEDULE = {
  openingHours: [
    { weekday: 1, closed: false, ranges: [{ from: '09:00', to: '18:00' }] },
    { weekday: 2, closed: false, ranges: [{ from: '09:00', to: '18:00' }] },
    { weekday: 3, closed: false, ranges: [{ from: '09:00', to: '18:00' }] },
    { weekday: 4, closed: false, ranges: [{ from: '09:00', to: '18:00' }] },
    { weekday: 5, closed: false, ranges: [{ from: '09:00', to: '18:00' }] },
    { weekday: 6, closed: false, ranges: [{ from: '09:00', to: '14:00' }] },
    { weekday: 0, closed: true, ranges: [] },
  ],
  hours: [
    { days: 'Montag – Freitag', time: '09:00 – 18:00 Uhr' },
    { days: 'Samstag', time: '09:00 – 14:00 Uhr' },
    { days: 'Sonntag', time: 'geschlossen' },
  ],
  services: Object.entries(FW_SERVICES).map(([id, s]) => ({
    id,
    duration: `${s.minutes} Minuten`,
    durationMinutes: s.minutes,
  })),
  settings: { ...DEFAULT_SETTINGS },
};

function normalizeScheduleInput(raw) {
  if (!raw || typeof raw !== 'object') return FW_DEFAULT_SCHEDULE;
  return {
    openingHours:
      Array.isArray(raw.openingHours) && raw.openingHours.length
        ? raw.openingHours
        : FW_DEFAULT_SCHEDULE.openingHours,
    hours: Array.isArray(raw.hours) && raw.hours.length ? raw.hours : FW_DEFAULT_SCHEDULE.hours,
    services: Array.isArray(raw.services) && raw.services.length ? raw.services : FW_DEFAULT_SCHEDULE.services,
    settings: { ...DEFAULT_SETTINGS, ...(raw.settings || {}) },
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatGermanDate(dateStr, time) {
  const d = parseDateOnly(dateStr);
  const label = d.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  return `${label}, ${time} Uhr`;
}

function readBookingsRaw(store) {
  try {
    const raw = store[FW_BOOKINGS_KEY]?.value;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readBookings(store) {
  return readBookingsRaw(store).map(decryptBookingPii);
}

function writeBookings(store, list) {
  const encrypted = list.map((b) => encryptBookingPii(b));
  store[FW_BOOKINGS_KEY] = { value: JSON.stringify(encrypted), updatedAt: new Date().toISOString() };
}

function appendEmailLog(store, entry) {
  let log = [];
  try {
    const raw = store[FW_EMAIL_LOG_KEY]?.value;
    if (raw) log = JSON.parse(raw);
    if (!Array.isArray(log)) log = [];
  } catch {
    log = [];
  }
  log.unshift(entry);
  store[FW_EMAIL_LOG_KEY] = { value: JSON.stringify(log.slice(0, 80)), updatedAt: new Date().toISOString() };
}

function addNote(booking, text) {
  if (!booking.notes) booking.notes = [];
  booking.notes.unshift({ at: new Date().toISOString(), text: sanitizeText(text, 500) });
}

function serviceLabel(serviceId, schedule) {
  if (FW_SERVICES[serviceId]) return FW_SERVICES[serviceId].label;
  const svc = normalizeScheduleInput(schedule).services.find((s) => s.id === serviceId);
  return svc?.id || serviceId;
}

function buildCustomerEmail(booking, service, extra = {}) {
  const subject =
    extra.subject ||
    (booking.status === 'confirmed'
      ? `Termin bestätigt — ${formatGermanDate(booking.date, booking.slot)}`
      : `Terminanfrage eingegangen — Fusswerk Bad Rothenfelde`);
  const headline =
    extra.headline ||
    (booking.status === 'confirmed' ? 'Ihr Termin ist bestätigt' : 'Vielen Dank für Ihre Anfrage');
  const lead =
    extra.lead ||
    (booking.status === 'confirmed'
      ? 'Wir freuen uns auf Ihren Besuch in der Salinenstraße.'
      : 'Wir prüfen Ihre Anfrage und melden uns in Kürze mit der Bestätigung.');
  const html = `<!DOCTYPE html><html lang="de"><body style="margin:0;background:#f3efe8;font-family:Georgia,serif;color:#1c2428">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" style="background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:linear-gradient(135deg,#6a8fa8,#4f6f86);padding:28px 32px;color:#fff">
<div style="font-family:Montserrat,Arial,sans-serif;font-size:13px;letter-spacing:.28em">FUSSWERK</div>
<div style="font-size:22px;margin-top:8px">${headline}</div>
</td></tr>
<tr><td style="padding:28px 32px;font-family:Arial,sans-serif;font-size:15px;line-height:1.65;color:#4f5d63">
<p style="margin:0 0 16px">Guten Tag ${escapeHtml(booking.name)},</p>
<p style="margin:0 0 20px">${lead}</p>
<table width="100%" style="background:#f7f4ef;border-radius:12px;padding:16px">
<tr><td style="padding:8px 16px;font-size:14px"><strong>Leistung:</strong> ${escapeHtml(service.label)}</td></tr>
<tr><td style="padding:8px 16px;font-size:14px"><strong>Termin:</strong> ${escapeHtml(formatGermanDate(booking.date, booking.slot))}</td></tr>
<tr><td style="padding:8px 16px;font-size:14px"><strong>Status:</strong> ${booking.status === 'confirmed' ? 'Bestätigt' : booking.status === 'cancelled' ? 'Abgesagt' : 'Anfrage eingegangen'}</td></tr>
</table>
${extra.footer ? `<p style="margin:20px 0 0">${extra.footer}</p>` : ''}
<p style="margin:20px 0 0">Salinenstraße 2–6 · 49214 Bad Rothenfelde</p>
</td></tr></table></td></tr></table></body></html>`;
  if (!booking.email) return null;
  return { to: booking.email, subject, html };
}

function buildOwnerEmail(booking, service, confirmUrl) {
  const subject = `Neue Terminanfrage — ${booking.name} · ${booking.date} ${booking.slot}`;
  const contact = [
    booking.email ? `<li><strong>E-Mail:</strong> ${escapeHtml(booking.email)}</li>` : '',
    booking.phone ? `<li><strong>Telefon:</strong> ${escapeHtml(booking.phone)}</li>` : '',
  ].join('');
  const html = `<!DOCTYPE html><html lang="de"><body style="margin:0;background:#f3efe8;font-family:Arial,sans-serif;color:#1c2428">
<table width="100%"><tr><td align="center" style="padding:32px 16px">
<table width="560" style="background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="padding:28px 32px">
<h1 style="margin:0 0 12px;font-size:22px">Neue Terminanfrage</h1>
<p style="margin:0 0 20px;color:#4f5d63">${escapeHtml(booking.name)} möchte einen Termin.</p>
<ul style="margin:0 0 24px;padding-left:18px;line-height:1.7;color:#4f5d63">
${contact}
<li><strong>Leistung:</strong> ${escapeHtml(service.label)}</li>
<li><strong>Termin:</strong> ${escapeHtml(formatGermanDate(booking.date, booking.slot))}</li>
</ul>
<a href="${confirmUrl}" style="display:inline-block;padding:14px 28px;background:#6a8fa8;color:#fff;text-decoration:none;border-radius:999px;font-weight:700">Termin bestätigen</a>
</td></tr></table></td></tr></table></body></html>`;
  return { to: FW_OWNER_EMAIL, subject, html };
}

function createBookingRecord(body, randomToken, nowIso, schedule = FW_DEFAULT_SCHEDULE, clientIp = '') {
  const name = sanitizeText(body.name, 80);
  const email = sanitizeEmail(body.email);
  const phone = sanitizePhone(body.phone);
  const date = sanitizeText(body.date, 10);
  const slot = sanitizeText(body.slot, 5);
  const serviceId = sanitizeText(body.serviceId || 'classic', 20);
  const status = body.status === 'confirmed' ? 'confirmed' : 'pending';
  const source = body.source === 'manual' ? 'manual' : 'web';
  const clientKey = sanitizeText(body.clientKey, 64);

  if (!name || name.length < 2) return { error: 'Bitte Namen angeben' };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { error: 'Bitte gültige E-Mail angeben' };
  }
  if (!parseDateOnly(date)) {
    return { error: 'Ungültiges Datum' };
  }
  if (!/^\d{2}:\d{2}$/.test(slot)) {
    return { error: 'Ungültige Uhrzeit' };
  }

  return {
    booking: {
      id: `fw-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      token: randomToken(),
      name,
      email,
      phone,
      date,
      slot,
      serviceId,
      status,
      source,
      clientKey: clientKey || undefined,
      clientIp: clientIp && clientIp !== 'unknown' ? clientIp : undefined,
      notes: [],
      createdAt: nowIso(),
      confirmedAt: status === 'confirmed' ? nowIso() : undefined,
    },
  };
}

async function handleFusswerkBooking({ req, res, method, pathname, url, store, persistStore, readBody, sendJson, sendRedirect, randomToken, nowIso, clientIp: resolveClientIp }) {
  if (!pathname.startsWith('/api/fusswerk/')) return false;

  const bookingIdMatch = pathname.match(/^\/api\/fusswerk\/bookings\/([^/]+)$/);

  if (method === 'GET' && pathname === '/api/fusswerk/bookings') {
    try {
      const bookings = readBookings(store).sort((a, b) => {
        const da = `${a.date}T${a.slot}`;
        const db = `${b.date}T${b.slot}`;
        return da.localeCompare(db);
      });
      sendJson(res, 200, { ok: true, bookings });
    } catch {
      sendJson(res, 500, { ok: false, error: 'Buchungen konnten nicht gelesen werden.' });
    }
    return true;
  }

  if (method === 'GET' && pathname === '/api/fusswerk/slots') {
    const date = url.searchParams.get('date') || '';
    if (!parseDateOnly(date)) {
      sendJson(res, 400, { ok: false, error: 'Ungültiges Datum' });
      return true;
    }
    const serviceId = sanitizeText(url.searchParams.get('serviceId') || '', 20) || undefined;
    const schedule = FW_DEFAULT_SCHEDULE;
    const bookings = readBookings(store);
    const slots = computeSlots(date, schedule, bookings, serviceId);
    sendJson(res, 200, { ok: true, date, slots });
    return true;
  }

  if (method === 'POST' && pathname === '/api/fusswerk/slots') {
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const date = sanitizeText(body.date, 10);
      if (!parseDateOnly(date)) {
        sendJson(res, 400, { ok: false, error: 'Ungültiges Datum' });
        return true;
      }
      const serviceId = sanitizeText(body.serviceId || '', 20) || undefined;
      const schedule = normalizeScheduleInput(body.schedule);
      const bookings = readBookings(store);
      const slots = computeSlots(date, schedule, bookings, serviceId);
      sendJson(res, 200, { ok: true, date, slots });
    } catch {
      sendJson(res, 400, { ok: false, error: 'Slots konnten nicht berechnet werden' });
    }
    return true;
  }

  if (method === 'POST' && pathname === '/api/fusswerk/bookings') {
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const schedule = normalizeScheduleInput(body.schedule);
      const ip = typeof resolveClientIp === 'function' ? resolveClientIp(req) : '';
      const created = createBookingRecord(body, randomToken, nowIso, schedule, ip);
      if (created.error) {
        sendJson(res, 400, { ok: false, error: created.error });
        return true;
      }
      const booking = created.booking;
      const service = FW_SERVICES[booking.serviceId] || FW_SERVICES.classic;
      const bookings = readBookings(store);
      const audience = booking.source === 'manual' ? 'staff' : 'customer';

      if (!isSlotAvailable(booking.date, booking.slot, booking.serviceId, schedule, bookings, new Date(), audience)) {
        sendJson(res, 409, { ok: false, error: 'Dieser Termin ist leider nicht mehr verfügbar' });
        return true;
      }
      if (bookingClash(bookings, booking.date, booking.slot, booking.serviceId, schedule, undefined, audience)) {
        sendJson(res, 409, { ok: false, error: 'Dieser Termin ist leider vergeben' });
        return true;
      }

      bookings.push(booking);
      writeBookings(store, bookings);

      const confirmUrl = `${FW_ORIGIN}/demo/fusswerk/termin-bestaetigen?token=${encodeURIComponent(booking.token)}`;
      const customerEmail = buildCustomerEmail(booking, service);
      const ownerEmail = buildOwnerEmail(booking, service, confirmUrl);

      appendEmailLog(store, {
        id: booking.id,
        sentAt: nowIso(),
        customer: customerEmail,
        owner: ownerEmail,
      });

      await persistStore();

      sendJson(res, 201, {
        ok: true,
        booking: { id: booking.id, status: booking.status, date: booking.date, slot: booking.slot, service: service.label },
        emails: { customer: customerEmail, owner: ownerEmail },
        demo: true,
        message: 'In der Live-Version werden diese E-Mails automatisch versendet. Hier sehen Sie die Vorschau.',
      });
    } catch {
      sendJson(res, 400, { ok: false, error: 'Anfrage fehlgeschlagen' });
    }
    return true;
  }

  if (method === 'PATCH' && bookingIdMatch) {
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const action = sanitizeText(body.action, 20);
      const bookings = readBookings(store);
      const idx = bookings.findIndex((b) => b.id === bookingIdMatch[1]);
      if (idx < 0) {
        sendJson(res, 404, { ok: false, error: 'Termin nicht gefunden' });
        return true;
      }
      const booking = bookings[idx];
      const service = FW_SERVICES[booking.serviceId] || FW_SERVICES.classic;
      let customerEmail = null;

      if (action === 'confirm') {
        booking.status = 'confirmed';
        booking.confirmedAt = nowIso();
        addNote(booking, 'Termin vom Studio bestätigt.');
        customerEmail = buildCustomerEmail(booking, service, {
          headline: 'Ihr Termin ist bestätigt',
          lead: 'Wir freuen uns auf Ihren Besuch.',
        });
      } else if (action === 'cancel') {
        booking.status = 'cancelled';
        addNote(booking, sanitizeText(body.note, 500) || 'Termin vom Studio abgesagt.');
        customerEmail = buildCustomerEmail(booking, service, {
          subject: `Termin abgesagt — ${formatGermanDate(booking.date, booking.slot)}`,
          headline: 'Ihr Termin wurde abgesagt',
          lead: 'Bitte vereinbaren Sie bei Bedarf einen neuen Termin.',
        });
      } else if (action === 'reschedule') {
        const newDate = sanitizeText(body.date, 10);
        const newSlot = sanitizeText(body.slot, 5);
        const mode = sanitizeText(body.notifyMode, 20) || 'direct';
        const schedule = normalizeScheduleInput(body.schedule);
        if (!parseDateOnly(newDate)) {
          sendJson(res, 400, { ok: false, error: 'Ungültiges Datum' });
          return true;
        }
        const rescheduleAudience = body.audience === 'staff' ? 'staff' : 'customer';
        if (!isSlotAvailable(newDate, newSlot, booking.serviceId, schedule, bookings, new Date(), rescheduleAudience)) {
          sendJson(res, 409, { ok: false, error: 'Dieser Termin ist leider nicht mehr verfügbar' });
          return true;
        }
        if (bookingClash(bookings, newDate, newSlot, booking.serviceId, schedule, booking.id, rescheduleAudience)) {
          sendJson(res, 409, { ok: false, error: 'Neuer Termin ist bereits belegt' });
          return true;
        }
        const oldLabel = formatGermanDate(booking.date, booking.slot);
        const newLabel = formatGermanDate(newDate, newSlot);

        if (mode === 'request') {
          booking.rescheduleRequest = { date: newDate, slot: newSlot, requestedAt: nowIso() };
          addNote(booking, `Verschiebung angefragt: ${oldLabel} → ${newLabel} (Kunde soll bestätigen).`);
          customerEmail = buildCustomerEmail(booking, service, {
            subject: `Terminverschiebung — bitte bestätigen`,
            headline: 'Können wir Ihren Termin verschieben?',
            lead: `Wir möchten Ihren Termin von ${escapeHtml(oldLabel)} auf ${escapeHtml(newLabel)} verlegen. Bitte melden Sie sich telefonisch oder per E-Mail.`,
            footer: 'Vielen Dank für Ihr Verständnis.',
          });
        } else {
          booking.date = newDate;
          booking.slot = newSlot;
          booking.rescheduleRequest = undefined;
          addNote(booking, `Termin verschoben: ${oldLabel} → ${newLabel}.`);
          customerEmail = buildCustomerEmail(booking, service, {
            subject: `Termin verschoben — ${newLabel}`,
            headline: 'Ihr Termin wurde verschoben',
            lead: `Ihr neuer Termin: ${newLabel}.`,
          });
        }
      } else {
        sendJson(res, 400, { ok: false, error: 'Unbekannte Aktion' });
        return true;
      }

      bookings[idx] = booking;
      writeBookings(store, bookings);
      if (customerEmail) {
        appendEmailLog(store, { id: `${booking.id}-${action}`, sentAt: nowIso(), customer: customerEmail, owner: null });
      }
      await persistStore();
      sendJson(res, 200, { ok: true, booking });
    } catch {
      sendJson(res, 400, { ok: false, error: 'Aktion fehlgeschlagen' });
    }
    return true;
  }

  if (method === 'GET' && pathname === '/api/fusswerk/confirm') {
    const token = url.searchParams.get('token') || '';
    const bookings = readBookings(store);
    const booking = bookings.find((b) => b.token === token);
    if (!booking) {
      sendRedirect(res, `${FW_ORIGIN}/demo/fusswerk/termin-bestaetigen?fehler=1`);
      return true;
    }
    if (booking.status !== 'confirmed') {
      booking.status = 'confirmed';
      booking.confirmedAt = nowIso();
      addNote(booking, 'Termin vom Kunden per Link bestätigt.');
      writeBookings(store, bookings);
      const service = FW_SERVICES[booking.serviceId] || FW_SERVICES.classic;
      const customerEmail = buildCustomerEmail(booking, service);
      appendEmailLog(store, {
        id: `${booking.id}-confirmed`,
        sentAt: nowIso(),
        customer: customerEmail,
        owner: null,
      });
      await persistStore();
    }
    sendRedirect(res, `${FW_ORIGIN}/demo/fusswerk/termin-bestaetigen?ok=1`);
    return true;
  }

  sendJson(res, 404, { ok: false, error: 'Nicht gefunden' });
  return true;
}

module.exports = { handleFusswerkBooking };
