'use strict';

const crypto = require('crypto');

const KEY_SOURCE = process.env.FUSSWERK_DATA_KEY || 'fusswerk-demo-data-key-change-me!!';

function deriveKey() {
  return crypto.createHash('sha256').update(KEY_SOURCE).digest();
}

function encryptText(plain) {
  if (!plain) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${enc.toString('base64url')}`;
}

function decryptText(stored) {
  if (!stored) return '';
  if (!String(stored).startsWith('v1:')) return String(stored);
  try {
    const parts = String(stored).split(':');
    if (parts.length !== 4) return '';
    const iv = Buffer.from(parts[1], 'base64url');
    const tag = Buffer.from(parts[2], 'base64url');
    const data = Buffer.from(parts[3], 'base64url');
    const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

function encryptBookingPii(booking) {
  return {
    ...booking,
    name: encryptText(booking.name),
    email: booking.email ? encryptText(booking.email) : '',
    phone: booking.phone ? encryptText(booking.phone) : '',
    _enc: true,
  };
}

function decryptBookingPii(booking) {
  if (!booking) return booking;
  return {
    ...booking,
    name: decryptText(booking.name),
    email: booking.email ? decryptText(booking.email) : '',
    phone: booking.phone ? decryptText(booking.phone) : '',
  };
}

module.exports = { encryptText, decryptText, encryptBookingPii, decryptBookingPii };
