/** Kanonische Firmendaten — Demo Weißer Schäfer (Etikett, Vorschau, Druck). */
export const WS_BUSINESS = {
  brand: 'Weißer Schäfer',
  brandPrint: 'WEISSER SCHÄFER',
  tagline: 'Naturdärme & Wursthüllen',
  established: 'EST. 2024',
  owner: 'Thomas Weiß',
  ownerLabel: 'Inhaber',
  street: 'Industriestraße 14',
  zip: '33378',
  city: 'Rheda-Wiedenbrück',
  country: 'Deutschland',
  phone: '+49 5242 987650',
  phoneDisplay: '05242 / 987 650',
  email: 'info@weisser-schaefer.de',
  web: 'www.weisser-schaefer.de',
} as const;

export const WS_BUSINESS_ADDRESS_LINE = `${WS_BUSINESS.street} · ${WS_BUSINESS.zip} ${WS_BUSINESS.city}`;

export const WS_BUSINESS_CONTACT_LINES = [
  `${WS_BUSINESS.ownerLabel}: ${WS_BUSINESS.owner}`,
  WS_BUSINESS_ADDRESS_LINE,
  `Tel. ${WS_BUSINESS.phoneDisplay}`,
  WS_BUSINESS.email,
] as const;
