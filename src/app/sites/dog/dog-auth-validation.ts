const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeAuthEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateAuthEmail(email: string): string | null {
  const normalized = normalizeAuthEmail(email);
  if (!normalized) return 'E-Mail eingeben';
  if (!EMAIL_RE.test(normalized) || normalized.length > 254) {
    return 'Ungültige E-Mail-Adresse';
  }
  return null;
}

export function validateAuthPassword(password: string): string | null {
  if (!password) return 'Passwort eingeben';
  if (password.length < 10) return 'Passwort mindestens 10 Zeichen';
  if (!/[A-Z]/.test(password)) return 'Mindestens ein Großbuchstabe';
  if (!/[a-z]/.test(password)) return 'Mindestens ein Kleinbuchstabe';
  if (!/[0-9]/.test(password) && !/[^A-Za-z0-9]/.test(password)) {
    return 'Mindestens eine Zahl oder ein Sonderzeichen';
  }
  return null;
}

export function validateRegisterForm(
  email: string,
  emailConfirm: string,
  password: string,
  passwordConfirm: string,
): string | null {
  const mailErr = validateAuthEmail(email);
  if (mailErr) return mailErr;
  if (normalizeAuthEmail(email) !== normalizeAuthEmail(emailConfirm)) {
    return 'E-Mail-Adressen stimmen nicht überein';
  }
  const passErr = validateAuthPassword(password);
  if (passErr) return passErr;
  if (password !== passwordConfirm) return 'Passwörter stimmen nicht überein';
  return null;
}

export function validateLoginForm(email: string, password: string): string | null {
  const mailErr = validateAuthEmail(email);
  if (mailErr) return mailErr;
  if (!password) return 'Passwort eingeben';
  return null;
}
