import { Injectable, computed, inject, signal } from '@angular/core';
import { FusswerkAuthService } from './fusswerk-auth.service';
import { FusswerkBookingAdminService } from './fusswerk-booking-admin.service';
import { FusswerkContentService } from './fusswerk-content.service';
import {
  FW_CHAT_TEMPLATE_CARD_TITLES,
  FW_CHAT_TEMPLATE_INTROS,
  type FwAppointmentPayload,
  type FwChatAuthorRole,
  type FwChatConversation,
  type FwChatMessage,
  type FwChatTemplateId,
} from './fusswerk-chat.types';
import { detectAutoReplyTemplates } from './fusswerk-chat-intent.util';

export type {
  FwAppointmentPayload,
  FwChatAuthorRole,
  FwChatConversation,
  FwChatMessage,
  FwChatTemplateId,
} from './fusswerk-chat.types';
export { FW_CHAT_TEMPLATE_LABELS, FW_CHAT_TEMPLATE_INTROS, FW_CHAT_TEMPLATE_CARD_TITLES } from './fusswerk-chat.types';

const FW_CHAT_KEY = 'fw-demo-support-chat-v1';
const FW_CHAT_GUEST_KEY = 'fw-demo-support-chat-guest-v1';
const FW_CHAT_GUEST_NAME_KEY = 'fw-demo-support-chat-guest-name-v1';
const FW_CHAT_SYNC_CHANNEL = 'fw-demo-support-chat-sync';
const FW_CHAT_AUTO_AUTHOR = 'Fusswerk Studio';

@Injectable({ providedIn: 'root' })
export class FusswerkChatService {
  private readonly auth = inject(FusswerkAuthService);
  private readonly content = inject(FusswerkContentService);
  private readonly bookings = inject(FusswerkBookingAdminService);
  private readonly syncChannel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(FW_CHAT_SYNC_CHANNEL) : null;

  private readonly conversationsState = signal<FwChatConversation[]>(this.loadConversations());
  private readonly guestId = signal<string | null>(this.ensureGuestId());
  private readonly guestNameState = signal<string>(this.loadGuestName());

  readonly guestName = computed(() => this.guestNameState());
  /** Steigt bei jeder externen oder lokalen Chat-Aktualisierung — für Live-Reaktion in der UI. */
  readonly revision = signal(0);
  readonly conversations = computed(() =>
    [...this.conversationsState()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );
  readonly openConversations = computed(() => this.conversations().filter((e) => e.open));
  readonly waitingForStaffCount = computed(
    () => this.openConversations().filter((e) => this.isWaitingForStaff(e)).length,
  );

  readonly myConversation = computed(() => this.findGuestConversation());

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('storage', (event) => {
      if (event.key === FW_CHAT_KEY) this.refreshFromStorage();
      if (event.key === FW_CHAT_GUEST_NAME_KEY) {
        this.guestNameState.set(this.loadGuestName());
      }
    });
    this.syncChannel?.addEventListener('message', () => {
      this.refreshFromStorage();
    });

    if (typeof window !== 'undefined') {
      window.setInterval(() => {
        if (document.visibilityState === 'visible') this.refreshFromStorage();
      }, 3000);
    }
  }

  refreshFromStorage(): void {
    const fresh = this.readFromStorage();
    if (!fresh) return;
    const normalized = fresh.map((c) => ({
      ...c,
      messages: c.messages.map((m) => this.normalizeMessage(m)),
    }));
    const nextFp = this.fingerprint(normalized);
    if (nextFp === this.fingerprint(this.conversationsState())) return;
    this.conversationsState.set(normalized);
    this.revision.update((n) => n + 1);
  }

  conversationById(id: string): FwChatConversation | null {
    return this.conversations().find((e) => e.id === id) ?? null;
  }

  updateGuestName(name: string): void {
    const next = name.trim();
    this.guestNameState.set(next);
    localStorage.setItem(FW_CHAT_GUEST_NAME_KEY, next);
  }

  startGuestConversation(name: string, message: string): string | null {
    const guestName = name.trim();
    const text = message.trim().slice(0, 1200);
    if (!guestName || !text) return 'Bitte Name und Nachricht eingeben.';
    this.updateGuestName(guestName);
    const guestId = this.guestId();
    if (!guestId) return 'Chat konnte nicht gestartet werden.';

    const existing = this.conversationsState().find((e) => e.requesterId === guestId) ?? null;
    if (existing) {
      if (existing.closedByStaff || !existing.open) {
        this.mutate((list) => list.filter((e) => e.requesterId !== guestId));
      } else {
        this.appendMessage(existing.id, this.textMessage('guest', guestName, text));
        this.maybeAutoReplyToGuest(existing.id, text);
        return null;
      }
    }

    const now = new Date().toISOString();
    const conversation: FwChatConversation = {
      id: this.makeId('chat'),
      requesterId: guestId,
      contactName: guestName,
      createdAt: now,
      updatedAt: now,
      open: true,
      messages: [this.textMessage('guest', guestName, text, now)],
    };
    this.mutate((list) => [conversation, ...list]);
    this.maybeAutoReplyToGuest(conversation.id, text);
    return null;
  }

  sendGuestMessage(message: string): string | null {
    const conversation = this.findGuestConversation();
    if (!conversation) return 'Bitte zuerst einen Chat starten.';
    if (!conversation.open || conversation.closedByStaff) {
      return 'Dieser Chat wurde beendet. Bitte starten Sie einen neuen Chat.';
    }
    const text = message.trim().slice(0, 1200);
    if (!text) return 'Bitte eine Nachricht eingeben.';
    const guestName = this.guestName().trim() || conversation.contactName;
    this.appendMessage(conversation.id, this.textMessage('guest', guestName, text));
    this.updateGuestName(guestName);
    this.maybeAutoReplyToGuest(conversation.id, text);
    return null;
  }

  sendStaffReply(conversationId: string, message: string): string | null {
    if (!this.auth.isStaff()) return 'Keine Berechtigung.';
    const user = this.auth.currentUser();
    if (!user) return 'Nicht angemeldet.';
    const text = message.trim().slice(0, 1200);
    if (!text) return 'Bitte eine Nachricht eingeben.';
    if (!this.conversationById(conversationId)) return 'Chat nicht gefunden.';
    this.appendMessage(conversationId, this.textMessage('staff', user.contactName, text));
    return null;
  }

  sendStaffTemplate(conversationId: string, templateId: FwChatTemplateId): string | null {
    if (!this.auth.isStaff()) return 'Keine Berechtigung.';
    const user = this.auth.currentUser();
    if (!user) return 'Nicht angemeldet.';
    if (!this.conversationById(conversationId)) return 'Chat nicht gefunden.';
    this.appendTemplateReply(conversationId, templateId, user.contactName);
    return null;
  }

  async sendGuestAppointmentRequest(
    payload: Omit<FwAppointmentPayload, 'status' | 'proposedBy'>,
  ): Promise<string | null> {
    const conversation = this.findGuestConversation();
    if (!conversation) return 'Bitte zuerst einen Chat starten.';
    if (!conversation.open || conversation.closedByStaff) {
      return 'Dieser Chat wurde beendet. Bitte starten Sie einen neuen Chat.';
    }
    const guestName = this.guestName().trim() || conversation.contactName;
    return this.sendAppointmentProposal(conversation.id, 'guest', guestName, payload);
  }

  async sendStaffAppointmentProposal(
    conversationId: string,
    payload: Omit<FwAppointmentPayload, 'status' | 'proposedBy'>,
  ): Promise<string | null> {
    if (!this.auth.isStaff()) return 'Keine Berechtigung.';
    const user = this.auth.currentUser();
    if (!user) return 'Nicht angemeldet.';
    return this.sendAppointmentProposal(conversationId, 'staff', user.contactName, payload);
  }

  canRespondToAppointment(message: FwChatMessage, viewerRole: FwChatAuthorRole): boolean {
    if (message.kind !== 'appointment' || !message.appointment) return false;
    if (message.appointment.status !== 'pending') return false;
    return message.appointment.proposedBy !== viewerRole;
  }

  async respondToAppointment(
    conversationId: string,
    messageId: string,
    accept: boolean,
    viewerRole: FwChatAuthorRole,
  ): Promise<string | null> {
    const conversation = this.conversationById(conversationId);
    if (!conversation) return 'Chat nicht gefunden.';
    if (viewerRole === 'guest' && this.isConversationEndedForGuest(conversation)) {
      return 'Dieser Chat wurde beendet. Bitte starten Sie einen neuen Chat.';
    }
    const message = conversation.messages.find((m) => m.id === messageId);
    if (!message?.appointment) return 'Terminanfrage nicht gefunden.';
    if (!this.canRespondToAppointment(message, viewerRole)) return 'Keine Berechtigung.';

    if (!accept) {
      this.updateAppointmentStatus(conversationId, messageId, 'declined');
      const name = viewerRole === 'staff' ? this.auth.currentUser()?.contactName ?? 'Studio' : conversation.contactName;
      this.appendMessage(
        conversationId,
        this.textMessage(viewerRole, name, 'Terminvorschlag abgelehnt.'),
      );
      return null;
    }

    const appt = message.appointment;
    const err = await this.bookings.createManual({
      name: conversation.contactName,
      date: appt.date,
      slot: appt.slot,
      serviceId: appt.serviceId,
      status: 'confirmed',
    });
    if (err) return err;

    const refreshed = this.bookings.all().find(
      (b) => b.date === appt.date && b.slot === appt.slot && b.serviceId === appt.serviceId,
    );
    this.updateAppointmentStatus(conversationId, messageId, 'confirmed', refreshed?.id);
    const confirmer =
      viewerRole === 'staff' ? this.auth.currentUser()?.contactName ?? 'Studio' : conversation.contactName;
    this.appendMessage(
      conversationId,
      this.textMessage(
        viewerRole,
        confirmer,
        `✓ Termin bestätigt: ${appt.serviceName} am ${this.formatGermanDate(appt.date, appt.slot)} — im Kalender eingetragen.`,
      ),
    );
    return null;
  }

  closeConversationByStaff(conversationId: string): string | null {
    if (!this.auth.isStaff()) return 'Keine Berechtigung.';
    const user = this.auth.currentUser();
    if (!user) return 'Nicht angemeldet.';
    const conversation = this.conversationById(conversationId);
    if (!conversation) return 'Chat nicht gefunden.';
    if (!conversation.open) return null;

    const farewell = this.textMessage(
      'staff',
      user.contactName,
      'Ein Mitarbeiter hat den Chat verlassen. Vielen Dank für Ihre Nachricht — wir freuen uns, wieder von Ihnen zu hören!',
    );
    this.mutate((list) =>
      list.map((entry) => {
        if (entry.id !== conversationId) return entry;
        return {
          ...entry,
          open: false,
          closedByStaff: true,
          updatedAt: farewell.createdAt,
          messages: [...entry.messages, farewell],
        };
      }),
    );
    return null;
  }

  clearGuestConversation(): void {
    const guestId = this.guestId();
    if (!guestId) return;
    this.mutate((list) => list.filter((e) => e.requesterId !== guestId));
  }

  isConversationEndedForGuest(conversation: FwChatConversation): boolean {
    return !conversation.open || conversation.closedByStaff === true;
  }

  isWaitingForStaff(conversation: FwChatConversation): boolean {
    if (!conversation.open || !conversation.messages.length) return false;
    const last = conversation.messages[conversation.messages.length - 1];
    if (last.kind === 'appointment' && last.appointment?.status === 'pending') {
      return last.appointment.proposedBy === 'guest';
    }
    return last.authorRole !== 'staff';
  }

  formatGermanDate(date: string, slot: string): string {
    const d = new Date(`${date}T12:00:00`);
    const label = d.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
    return `${label}, ${slot} Uhr`;
  }

  formatPrice(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  }

  playStaffNotification(): void {
    this.playSynth(880, 0.08, 0.12);
  }

  playCustomerReply(): void {
    this.playSynth(520, 0.06, 0.08);
  }

  private async sendAppointmentProposal(
    conversationId: string,
    role: FwChatAuthorRole,
    authorName: string,
    payload: Omit<FwAppointmentPayload, 'status' | 'proposedBy'>,
  ): Promise<string | null> {
    if (!payload.serviceId || !payload.date || !payload.slot) {
      return 'Bitte Leistung, Datum und Uhrzeit angeben.';
    }
    const appointment: FwAppointmentPayload = {
      ...payload,
      status: 'pending',
      proposedBy: role,
    };
    const summary = `Terminvorschlag: ${payload.serviceName} · ${this.formatPrice(payload.price)} · ${this.formatGermanDate(payload.date, payload.slot)}`;
    this.appendMessage(conversationId, {
      kind: 'appointment',
      authorRole: role,
      authorName,
      text: summary,
      appointment,
    });
    return null;
  }

  private maybeAutoReplyToGuest(conversationId: string, guestText: string): void {
    const conversation = this.conversationById(conversationId);
    if (!conversation || !conversation.open || conversation.closedByStaff) return;

    for (const templateId of detectAutoReplyTemplates(guestText)) {
      this.appendTemplateReply(conversationId, templateId, FW_CHAT_AUTO_AUTHOR);
    }
  }

  private appendTemplateReply(
    conversationId: string,
    templateId: FwChatTemplateId,
    authorName: string,
  ): void {
    const card = this.buildTemplateCard(templateId);
    this.appendMessage(conversationId, this.textMessage('staff', authorName, FW_CHAT_TEMPLATE_INTROS[templateId]));
    this.appendMessage(conversationId, {
      kind: 'info',
      authorRole: 'staff',
      authorName,
      text: card.body,
      infoTitle: card.title,
    });
  }

  private buildTemplateCard(templateId: FwChatTemplateId): { title: string; body: string } {
    const biz = this.content.business();
    if (templateId === 'angebot') {
      const lines = this.content.services().map(
        (s) => `• ${s.title} — ab ${this.formatPrice(s.fromPrice)} (${s.duration})`,
      );
      return {
        title: FW_CHAT_TEMPLATE_CARD_TITLES.angebot,
        body: lines.join('\n'),
      };
    }
    if (templateId === 'preise') {
      const lines = this.content.priceTiers().map(
        (p) => `• ${p.name}: ${this.formatPrice(p.price)} — ${p.duration}`,
      );
      return { title: FW_CHAT_TEMPLATE_CARD_TITLES.preise, body: lines.join('\n') };
    }
    if (templateId === 'kontakt') {
      return {
        title: FW_CHAT_TEMPLATE_CARD_TITLES.kontakt,
        body: `📞 ${biz.phone}\n✉️ ${biz.email}\n📍 ${biz.street}, ${biz.zip} ${biz.city}`,
      };
    }
    const hours = this.content.hours().map((h) => `• ${h.days}: ${h.time}`).join('\n');
    return { title: FW_CHAT_TEMPLATE_CARD_TITLES.hours, body: hours };
  }

  private updateAppointmentStatus(
    conversationId: string,
    messageId: string,
    status: FwAppointmentPayload['status'],
    bookingId?: string,
  ): void {
    this.mutate((list) =>
      list.map((entry) => {
        if (entry.id !== conversationId) return entry;
        return {
          ...entry,
          updatedAt: new Date().toISOString(),
          messages: entry.messages.map((m) => {
            if (m.id !== messageId || !m.appointment) return m;
            return {
              ...m,
              appointment: { ...m.appointment, status, bookingId: bookingId ?? m.appointment.bookingId },
            };
          }),
        };
      }),
    );
  }

  private findGuestConversation(): FwChatConversation | null {
    const id = this.guestId();
    if (!id) return null;
    return this.conversations().find((e) => e.requesterId === id) ?? null;
  }

  private textMessage(
    role: FwChatAuthorRole,
    authorName: string,
    text: string,
    createdAt?: string,
  ): FwChatMessage {
    return {
      id: this.makeId('msg'),
      kind: 'text',
      authorRole: role,
      authorName,
      text,
      createdAt: createdAt ?? new Date().toISOString(),
    };
  }

  private appendMessage(
    conversationId: string,
    message: Omit<FwChatMessage, 'id' | 'createdAt'> & { createdAt?: string },
  ): void {
    this.mutate((list) =>
      list.map((entry) => {
        if (entry.id !== conversationId) return entry;
        const now = message.createdAt ?? new Date().toISOString();
        return {
          ...entry,
          open: true,
          updatedAt: now,
          messages: [
            ...entry.messages,
            {
              id: this.makeId('msg'),
              kind: message.kind ?? 'text',
              authorRole: message.authorRole,
              authorName: message.authorName,
              text: message.text,
              createdAt: now,
              infoTitle: message.infoTitle,
              appointment: message.appointment ? { ...message.appointment } : undefined,
            },
          ],
        };
      }),
    );
  }

  private playSynth(freq: number, volume: number, duration: number): void {
    if (typeof window === 'undefined') return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // ignore
    }
  }

  private mutate(mutator: (list: FwChatConversation[]) => FwChatConversation[]): void {
    const fresh = this.readFromStorage() ?? this.conversationsState();
    const copied = fresh.map((e) => ({
      ...e,
      messages: e.messages.map((m) => this.normalizeMessage(m)),
    }));
    const next = mutator(copied);
    this.conversationsState.set(next);
    localStorage.setItem(FW_CHAT_KEY, JSON.stringify(next));
    this.revision.update((n) => n + 1);
    this.syncChannel?.postMessage({ type: 'chat-updated' });
  }

  private fingerprint(list: FwChatConversation[]): string {
    return list
      .map(
        (c) =>
          `${c.id}:${c.updatedAt}:${c.open}:${c.closedByStaff ? 1 : 0}:${c.messages.map((m) => `${m.id}:${m.createdAt}`).join(',')}`,
      )
      .join('|');
  }

  private normalizeMessage(raw: FwChatMessage): FwChatMessage {
    return {
      ...raw,
      kind: raw.kind ?? 'text',
      appointment: raw.appointment ? { ...raw.appointment } : undefined,
    };
  }

  private loadConversations(): FwChatConversation[] {
    return (this.readFromStorage() ?? []).map((c) => ({
      ...c,
      messages: c.messages.map((m) => this.normalizeMessage(m)),
    }));
  }

  private readFromStorage(): FwChatConversation[] | null {
    try {
      const raw = localStorage.getItem(FW_CHAT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private ensureGuestId(): string | null {
    if (typeof localStorage === 'undefined') return null;
    let id = localStorage.getItem(FW_CHAT_GUEST_KEY);
    if (!id) {
      id = `guest-${Date.now().toString(36)}`;
      localStorage.setItem(FW_CHAT_GUEST_KEY, id);
    }
    return id;
  }

  private loadGuestName(): string {
    return localStorage.getItem(FW_CHAT_GUEST_NAME_KEY) ?? '';
  }

  private makeId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }
}
