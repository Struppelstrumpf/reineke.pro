import { Injectable, computed, inject, signal } from '@angular/core';
import { WeisserSchaeferAuthService } from './weisser-schaefer-auth.service';

export type WsChatAuthorRole = 'guest' | 'customer' | 'staff';

export type WsChatMessage = {
  id: string;
  authorRole: WsChatAuthorRole;
  authorName: string;
  text: string;
  createdAt: string;
};

export type WsChatConversation = {
  id: string;
  requesterType: 'guest' | 'customer';
  requesterId: string;
  contactName: string;
  companyName?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
  open: boolean;
  messages: WsChatMessage[];
};

const WS_CHAT_KEY = 'ws-demo-support-chat-v1';
const WS_CHAT_GUEST_KEY = 'ws-demo-support-chat-guest-v1';
const WS_CHAT_GUEST_NAME_KEY = 'ws-demo-support-chat-guest-name-v1';
const WS_CHAT_SYNC_CHANNEL = 'ws-demo-support-chat-sync';
const WS_CHAT_AUDIO_KEY = 'ws-demo-support-chat-audio-v1';

type WsChatAudioSettings = {
  staffVolume: number;
  customerVolume: number;
  staffSoundDataUrl?: string;
};

@Injectable({ providedIn: 'root' })
export class WeisserSchaeferChatService {
  private readonly auth = inject(WeisserSchaeferAuthService);
  private readonly syncChannel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(WS_CHAT_SYNC_CHANNEL) : null;

  private readonly conversationsState = signal<WsChatConversation[]>(this.loadConversations());
  private readonly guestId = signal<string | null>(this.ensureGuestId());
  private readonly guestNameState = signal<string>(this.loadGuestName());
  private readonly audioSettingsState = signal<WsChatAudioSettings>(this.loadAudioSettings());

  readonly guestName = computed(() => this.guestNameState());
  readonly audioSettings = computed(() => this.audioSettingsState());
  readonly conversations = computed(() =>
    [...this.conversationsState()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );
  readonly openConversations = computed(() => this.conversations().filter((entry) => entry.open));
  readonly waitingForStaffCount = computed(
    () => this.openConversations().filter((entry) => this.isWaitingForStaff(entry)).length,
  );

  readonly myConversation = computed(() => {
    const user = this.auth.currentUser();
    if (user?.role === 'customer') {
      return (
        this.conversations().find(
          (entry) => entry.requesterType === 'customer' && entry.requesterId === user.id,
        ) ?? null
      );
    }
    if (user) {
      return null;
    }
    const guestId = this.guestId();
    if (!guestId) {
      return null;
    }
    return (
      this.conversations().find(
        (entry) => entry.requesterType === 'guest' && entry.requesterId === guestId,
      ) ?? null
    );
  });

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }
    window.addEventListener('storage', (event) => {
      if (event.key === WS_CHAT_KEY) {
        const fresh = this.readConversationsFromStorage();
        if (fresh) {
          this.conversationsState.set(fresh);
        }
      }
      if (event.key === WS_CHAT_GUEST_NAME_KEY) {
        this.guestNameState.set(this.loadGuestName());
      }
      if (event.key === WS_CHAT_AUDIO_KEY) {
        this.audioSettingsState.set(this.loadAudioSettings());
      }
    });
    this.syncChannel?.addEventListener('message', () => {
      const fresh = this.readConversationsFromStorage();
      if (fresh) {
        this.conversationsState.set(fresh);
      }
    });
  }

  conversationById(id: string): WsChatConversation | null {
    return this.conversations().find((entry) => entry.id === id) ?? null;
  }

  updateGuestName(name: string): void {
    const next = name.trim();
    this.guestNameState.set(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(WS_CHAT_GUEST_NAME_KEY, next);
    }
  }

  setStaffNotificationVolume(raw: number): void {
    const next = this.clampVolume(raw);
    this.updateAudioSettings({ staffVolume: next });
  }

  setCustomerReplyVolume(raw: number): void {
    const next = this.clampVolume(raw);
    this.updateAudioSettings({ customerVolume: next });
  }

  setStaffNotificationSoundDataUrl(dataUrl?: string): void {
    this.updateAudioSettings({ staffSoundDataUrl: dataUrl?.trim() || undefined });
  }

  playStaffNotification(): void {
    const settings = this.audioSettingsState();
    if (settings.staffSoundDataUrl) {
      const audio = new Audio(settings.staffSoundDataUrl);
      audio.volume = settings.staffVolume;
      void audio.play().catch(() => this.playSynth('staff', settings.staffVolume));
      return;
    }
    this.playSynth('staff', settings.staffVolume);
  }

  playCustomerReply(): void {
    const settings = this.audioSettingsState();
    this.playSynth('customer', settings.customerVolume);
  }

  startGuestConversation(name: string, message: string): string | null {
    if (this.auth.isLoggedIn()) {
      return 'Für angemeldete Konten bitte den Kundenchat verwenden.';
    }
    const guestName = name.trim();
    const text = this.normalizeMessage(message);
    if (!guestName || !text) {
      return 'Bitte Name und Nachricht eingeben.';
    }
    this.updateGuestName(guestName);
    const guestId = this.guestId();
    if (!guestId) {
      return 'Chat konnte nicht initialisiert werden.';
    }

    const existing =
      this.conversationsState().find(
        (entry) => entry.requesterType === 'guest' && entry.requesterId === guestId,
      ) ?? null;
    if (existing) {
      this.appendMessage(existing.id, {
        authorRole: 'guest',
        authorName: guestName,
        text,
      });
      return null;
    }

    const now = new Date().toISOString();
    const conversation: WsChatConversation = {
      id: this.makeId('chat'),
      requesterType: 'guest',
      requesterId: guestId,
      contactName: guestName,
      createdAt: now,
      updatedAt: now,
      open: true,
      messages: [
        {
          id: this.makeId('msg'),
          authorRole: 'guest',
          authorName: guestName,
          text,
          createdAt: now,
        },
      ],
    };
    this.mutateConversations((list) => [conversation, ...list]);
    return null;
  }

  sendGuestMessage(message: string): string | null {
    const conversation = this.myConversation();
    if (!conversation || conversation.requesterType !== 'guest') {
      return 'Bitte zuerst einen Chat starten.';
    }
    const guestName = this.guestName().trim() || conversation.contactName;
    const text = this.normalizeMessage(message);
    if (!text) {
      return 'Bitte eine Nachricht eingeben.';
    }
    this.appendMessage(conversation.id, {
      authorRole: 'guest',
      authorName: guestName,
      text,
    });
    this.updateGuestName(guestName);
    return null;
  }

  sendCustomerMessage(message: string): string | null {
    const user = this.auth.currentUser();
    if (!user || user.role !== 'customer') {
      return 'Nur Kunden können diesen Chat nutzen.';
    }
    const text = this.normalizeMessage(message);
    if (!text) {
      return 'Bitte eine Nachricht eingeben.';
    }
    let conversation =
      this.conversationsState().find(
        (entry) => entry.requesterType === 'customer' && entry.requesterId === user.id,
      ) ?? null;
    if (!conversation) {
      const now = new Date().toISOString();
      const created: WsChatConversation = {
        id: this.makeId('chat'),
        requesterType: 'customer',
        requesterId: user.id,
        contactName: user.contactName,
        companyName: user.companyName,
        phone: user.phone,
        address: user.address,
        createdAt: now,
        updatedAt: now,
        open: true,
        messages: [],
      };
      this.mutateConversations((list) => [created, ...list]);
      conversation = created;
    }

    this.mutateConversations((list) =>
      list.map((entry) => {
        if (entry.id !== conversation!.id) {
          return entry;
        }
        const now = new Date().toISOString();
        return {
          ...entry,
          contactName: user.contactName,
          companyName: user.companyName,
          phone: user.phone,
          address: user.address,
          open: true,
          updatedAt: now,
          messages: [
            ...entry.messages,
            {
              id: this.makeId('msg'),
              authorRole: 'customer',
              authorName: user.contactName,
              text,
              createdAt: now,
            },
          ],
        };
      }),
    );
    return null;
  }

  sendStaffReply(conversationId: string, message: string): string | null {
    if (!this.auth.isStaff()) {
      return 'Keine Berechtigung.';
    }
    const user = this.auth.currentUser();
    if (!user) {
      return 'Nicht angemeldet.';
    }
    const text = this.normalizeMessage(message);
    if (!text) {
      return 'Bitte eine Nachricht eingeben.';
    }
    if (!this.conversationById(conversationId)) {
      return 'Chat nicht gefunden.';
    }
    this.appendMessage(conversationId, {
      authorRole: 'staff',
      authorName: user.contactName,
      text,
    });
    return null;
  }

  setConversationOpen(conversationId: string, open: boolean): void {
    if (!this.auth.isStaff()) {
      return;
    }
    this.mutateConversations((list) =>
      list.map((entry) =>
        entry.id === conversationId
          ? {
              ...entry,
              open,
              updatedAt: new Date().toISOString(),
            }
          : entry,
      ),
    );
  }

  isWaitingForStaff(conversation: WsChatConversation): boolean {
    if (!conversation.open || conversation.messages.length === 0) {
      return false;
    }
    const last = conversation.messages[conversation.messages.length - 1];
    return last.authorRole !== 'staff';
  }

  private appendMessage(
    conversationId: string,
    message: Pick<WsChatMessage, 'authorRole' | 'authorName' | 'text'>,
  ): void {
    this.mutateConversations((list) =>
      list.map((entry) => {
        if (entry.id !== conversationId) {
          return entry;
        }
        const now = new Date().toISOString();
        return {
          ...entry,
          open: true,
          updatedAt: now,
          messages: [
            ...entry.messages,
            {
              id: this.makeId('msg'),
              authorRole: message.authorRole,
              authorName: message.authorName,
              text: message.text,
              createdAt: now,
            },
          ],
        };
      }),
    );
  }

  private normalizeMessage(raw: string): string {
    return raw.trim().slice(0, 1200);
  }

  private mutateConversations(mutator: (list: WsChatConversation[]) => WsChatConversation[]): void {
    const fresh = this.readConversationsFromStorage() ?? this.conversationsState();
    const copied = fresh.map((entry) => ({
      ...entry,
      messages: entry.messages.map((msg) => ({ ...msg })),
    }));
    const next = mutator(copied);
    this.conversationsState.set(next);
    this.persistConversations(next);
    this.syncChannel?.postMessage({ type: 'chat-updated' });
  }

  private loadConversations(): WsChatConversation[] {
    return this.readConversationsFromStorage() ?? [];
  }

  private readConversationsFromStorage(): WsChatConversation[] | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    try {
      const raw = localStorage.getItem(WS_CHAT_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return null;
      }
      return parsed
        .map((entry) => this.normalizeConversation(entry))
        .filter((entry): entry is WsChatConversation => entry !== null);
    } catch {
      return null;
    }
  }

  private normalizeConversation(raw: unknown): WsChatConversation | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }
    const value = raw as Partial<WsChatConversation>;
    if (
      !value.id ||
      !value.requesterType ||
      !value.requesterId ||
      !value.contactName ||
      !Array.isArray(value.messages)
    ) {
      return null;
    }
    const messages = value.messages
      .map((msg) => this.normalizeMessageEntry(msg))
      .filter((msg): msg is WsChatMessage => msg !== null);
    return {
      id: String(value.id),
      requesterType: value.requesterType === 'customer' ? 'customer' : 'guest',
      requesterId: String(value.requesterId),
      contactName: String(value.contactName),
      companyName: value.companyName ? String(value.companyName) : undefined,
      phone: value.phone ? String(value.phone) : undefined,
      address: value.address ? String(value.address) : undefined,
      createdAt: String(value.createdAt ?? new Date().toISOString()),
      updatedAt: String(value.updatedAt ?? new Date().toISOString()),
      open: value.open !== false,
      messages,
    };
  }

  private normalizeMessageEntry(raw: unknown): WsChatMessage | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }
    const value = raw as Partial<WsChatMessage>;
    if (!value.id || !value.authorRole || !value.authorName || !value.text) {
      return null;
    }
    const authorRole: WsChatAuthorRole =
      value.authorRole === 'staff'
        ? 'staff'
        : value.authorRole === 'customer'
          ? 'customer'
          : 'guest';
    return {
      id: String(value.id),
      authorRole,
      authorName: String(value.authorName),
      text: String(value.text),
      createdAt: String(value.createdAt ?? new Date().toISOString()),
    };
  }

  private persistConversations(conversations: WsChatConversation[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(WS_CHAT_KEY, JSON.stringify(conversations));
    } catch {
      // ignore storage quota errors
    }
  }

  private loadAudioSettings(): WsChatAudioSettings {
    const fallback: WsChatAudioSettings = {
      staffVolume: 0.45,
      customerVolume: 0.18,
      staffSoundDataUrl: undefined,
    };
    if (typeof localStorage === 'undefined') {
      return fallback;
    }
    try {
      const raw = localStorage.getItem(WS_CHAT_AUDIO_KEY);
      if (!raw) {
        return fallback;
      }
      const parsed = JSON.parse(raw) as Partial<WsChatAudioSettings>;
      return {
        staffVolume: this.clampVolume(parsed.staffVolume ?? fallback.staffVolume),
        customerVolume: this.clampVolume(parsed.customerVolume ?? fallback.customerVolume),
        staffSoundDataUrl:
          parsed.staffSoundDataUrl && parsed.staffSoundDataUrl.trim().length > 0
            ? parsed.staffSoundDataUrl
            : undefined,
      };
    } catch {
      return fallback;
    }
  }

  private updateAudioSettings(patch: Partial<WsChatAudioSettings>): void {
    const hasSoundPatch = Object.prototype.hasOwnProperty.call(patch, 'staffSoundDataUrl');
    const merged: WsChatAudioSettings = {
      ...this.audioSettingsState(),
      ...patch,
      staffVolume: this.clampVolume((patch.staffVolume ?? this.audioSettingsState().staffVolume) as number),
      customerVolume: this.clampVolume(
        (patch.customerVolume ?? this.audioSettingsState().customerVolume) as number,
      ),
      staffSoundDataUrl: hasSoundPatch
        ? patch.staffSoundDataUrl
        : this.audioSettingsState().staffSoundDataUrl,
    };
    this.audioSettingsState.set(merged);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(WS_CHAT_AUDIO_KEY, JSON.stringify(merged));
      } catch {
        // ignore storage quota errors
      }
    }
  }

  private clampVolume(value: number): number {
    if (!Number.isFinite(value)) {
      return 0.3;
    }
    return Math.max(0, Math.min(1, value));
  }

  private playSynth(kind: 'staff' | 'customer', volume: number): void {
    if (typeof window === 'undefined') {
      return;
    }
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) {
      return;
    }
    try {
      const ctx = new Ctx();
      const gain = ctx.createGain();
      gain.gain.value = this.clampVolume(volume);
      gain.connect(ctx.destination);

      if (kind === 'staff') {
        const oscA = ctx.createOscillator();
        const oscB = ctx.createOscillator();
        oscA.type = 'sine';
        oscB.type = 'triangle';
        oscA.frequency.value = 880;
        oscB.frequency.value = 1320;
        oscA.connect(gain);
        oscB.connect(gain);
        const t = ctx.currentTime;
        oscA.start(t);
        oscA.stop(t + 0.09);
        oscB.start(t + 0.08);
        oscB.stop(t + 0.18);
      } else {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = 620;
        osc.connect(gain);
        const t = ctx.currentTime;
        gain.gain.setValueAtTime(this.clampVolume(volume), t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        osc.start(t);
        osc.stop(t + 0.09);
      }

      window.setTimeout(() => {
        void ctx.close();
      }, 260);
    } catch {
      // Audio context may fail without prior user interaction.
    }
  }

  private ensureGuestId(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    const existing = localStorage.getItem(WS_CHAT_GUEST_KEY);
    if (existing) {
      return existing;
    }
    const created = this.makeId('guest');
    localStorage.setItem(WS_CHAT_GUEST_KEY, created);
    return created;
  }

  private loadGuestName(): string {
    if (typeof window === 'undefined') {
      return '';
    }
    return localStorage.getItem(WS_CHAT_GUEST_NAME_KEY) ?? '';
  }

  private makeId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
