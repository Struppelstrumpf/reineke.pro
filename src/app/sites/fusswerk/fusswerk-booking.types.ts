export const FW_IMAGES = {
  hero: '/fusswerk/hero-care.jpg',
  care: '/fusswerk/gallery-bath.jpg',
  detail: '/fusswerk/gallery-pedicure.jpg',
} as const;

export const FW_BOOKING_SERVICES = [
  {
    id: 'classic',
    label: 'Klassische Fußpflege',
    duration: '45 Min.',
    price: 48,
    note: 'Fußbad & Nagelpflege',
  },
  {
    id: 'shellac',
    label: 'Fußpflege mit Shellac / UV-Lack / Gel',
    duration: '60 Min.',
    price: 65,
    note: 'Inkl. Lackierung',
  },
] as const;

export type FwBookingSlot = {
  time: string;
  available: boolean;
  /** Studio darf buchen, auch wenn für Kunden gesperrt (Puffer/Schluss). */
  staffBookable?: boolean;
  booking?: {
    id: string;
    status: string;
    name: string;
    serviceId: string;
  } | null;
};

export type FwBookingNote = {
  at: string;
  text: string;
};

export type FwBookingRecord = {
  id: string;
  token: string;
  name: string;
  email: string;
  phone?: string;
  date: string;
  slot: string;
  serviceId: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  source?: 'web' | 'manual' | 'block';
  /** Für Sperrzeiten (serviceId block) — blockiert mehrere Zeitraster. */
  durationMinutes?: number;
  /** Browser-Schlüssel (localStorage) — Zuordnung mehrerer Web-Termine. */
  clientKey?: string;
  /** Server-IP bei Online-Buchung. */
  clientIp?: string;
  notes?: FwBookingNote[];
  rescheduleRequest?: { date: string; slot: string; requestedAt: string };
  createdAt: string;
  confirmedAt?: string;
};

export type FwBookingEmail = {
  to: string;
  subject: string;
  html: string;
};

export type FwBookingResult = {
  ok: boolean;
  error?: string;
  booking?: {
    id: string;
    status: string;
    date: string;
    slot: string;
    service: string;
  };
  emails?: {
    customer: FwBookingEmail;
    owner: FwBookingEmail;
  };
  message?: string;
};
