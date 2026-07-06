export type FwChatAuthorRole = 'guest' | 'staff';

export type FwChatMessageKind = 'text' | 'info' | 'appointment';

export type FwChatTemplateId = 'angebot' | 'preise' | 'kontakt' | 'hours';

export type FwAppointmentStatus = 'pending' | 'confirmed' | 'declined';

export type FwAppointmentPayload = {
  serviceId: string;
  serviceName: string;
  price: number;
  date: string;
  slot: string;
  status: FwAppointmentStatus;
  proposedBy: FwChatAuthorRole;
  bookingId?: string;
};

export type FwChatMessage = {
  id: string;
  kind: FwChatMessageKind;
  authorRole: FwChatAuthorRole;
  authorName: string;
  text: string;
  createdAt: string;
  infoTitle?: string;
  appointment?: FwAppointmentPayload;
};

export type FwChatConversation = {
  id: string;
  requesterId: string;
  contactName: string;
  createdAt: string;
  updatedAt: string;
  open: boolean;
  /** Vom Mitarbeiter beendet — Kunde sieht Verlauf, kann nicht mehr schreiben. */
  closedByStaff?: boolean;
  messages: FwChatMessage[];
};

export const FW_CHAT_TEMPLATE_LABELS: Record<FwChatTemplateId, string> = {
  angebot: 'Angebot senden',
  preise: 'Preise senden',
  kontakt: 'Kontakt senden',
  hours: 'Öffnungszeiten',
};

export const FW_CHAT_TEMPLATE_INTROS: Record<FwChatTemplateId, string> = {
  angebot: 'Gerne schicke ich Ihnen unser aktuelles Angebot:',
  preise: 'Hier finden Sie unsere aktuellen Preise:',
  kontakt: 'Hier finden Sie unsere Kontaktdaten:',
  hours: 'Hier finden Sie unsere aktuellen Öffnungszeiten:',
};

/** Überschriften der Info-Kästen im Chat — ohne Landingpage-Werbetexte. */
export const FW_CHAT_TEMPLATE_CARD_TITLES: Record<FwChatTemplateId, string> = {
  angebot: 'Leistungen',
  preise: 'Preise',
  kontakt: 'Kontakt',
  hours: 'Öffnungszeiten',
};
