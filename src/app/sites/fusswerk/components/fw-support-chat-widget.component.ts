import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FusswerkChatService } from '../fusswerk-chat.service';
import { FusswerkBookingService } from '../fusswerk-booking.service';
import type { FwBookingSlot } from '../fusswerk-booking.types';
import { FusswerkContentService } from '../fusswerk-content.service';
import { FwChatMessageComponent } from './fw-chat-message/fw-chat-message.component';
import { FwChatMessagesScroll } from '../fw-chat-messages-scroll';

const FW_CHAT_WIDGET_PREFS_KEY = 'fw-demo-support-chat-widget-v1';

type FwChatWidgetPrefs = {
  open: boolean;
  offsetX: number;
  offsetY: number;
};

type FwChatPanelPlacement = 'up-left' | 'up-right' | 'down-left' | 'down-right';

const GUEST_QUICK_MESSAGES: { label: string; text: string }[] = [
  { label: 'Angebot', text: 'Hallo, ich hätte gern ein unverbindliches Angebot.' },
  { label: 'Preise', text: 'Können Sie mir Ihre Preise schicken?' },
  { label: 'Öffnungszeiten', text: 'Wann haben Sie geöffnet?' },
];

@Component({
  selector: 'pv-fw-support-chat-widget',
  imports: [FormsModule, FwChatMessageComponent],
  templateUrl: './fw-support-chat-widget.component.html',
  styleUrls: ['./fw-support-chat-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwSupportChatWidgetComponent {
  @ViewChild('chatWidgetRoot')
  private chatWidgetRoot?: ElementRef<HTMLElement>;

  @ViewChild('chatBubble')
  private chatBubble?: ElementRef<HTMLButtonElement>;

  @ViewChild('chatPanel')
  private chatPanel?: ElementRef<HTMLElement>;

  @ViewChild('messagesEl')
  private messagesEl?: ElementRef<HTMLElement>;

  readonly chat = inject(FusswerkChatService);
  readonly content = inject(FusswerkContentService);
  private readonly booking = inject(FusswerkBookingService);
  private readonly destroyRef = inject(DestroyRef);

  readonly guestQuickMessages = GUEST_QUICK_MESSAGES;

  readonly open = signal(false);
  readonly widgetOffset = signal({ x: 0, y: 0 });
  readonly isDragging = signal(false);
  readonly panelPlacement = signal<FwChatPanelPlacement>('up-right');
  readonly panelStyle = signal({ left: 12, top: 12, maxHeight: 540, height: 520 });
  readonly guestName = signal(this.chat.guestName());
  readonly firstMessage = signal('');
  readonly messageDraft = signal('');
  readonly error = signal('');
  readonly hasUnreadReply = signal(false);
  readonly showApptForm = signal(false);
  readonly apptServiceId = signal('classic');
  readonly apptDate = signal(this.defaultApptDate());
  readonly apptSlot = signal('09:00');
  readonly apptBusy = signal(false);
  readonly apptSlots = signal<FwBookingSlot[]>([]);
  readonly apptSlotsLoading = signal(false);
  readonly showNewMessagesHint = signal(false);

  readonly services = this.content.services;

  private readonly messageScroll = new FwChatMessagesScroll(
    () => this.messagesEl?.nativeElement,
    this.showNewMessagesHint,
  );

  private dragPointerId: number | null = null;
  private dragStartedAt = { x: 0, y: 0 };
  private dragBaseOffset = { x: 0, y: 0 };
  private dragHasMoved = false;
  private suppressToggleClick = false;
  private ensureVisibleFrame = 0;
  private panelLayoutFrame = 0;
  private readyForMessageWatch = false;
  private knownMessageCount = 0;

  readonly conversation = computed(() => this.chat.myConversation());
  readonly conversationEnded = computed(() => {
    const conv = this.conversation();
    return !!conv && this.chat.isConversationEndedForGuest(conv);
  });

  constructor() {
    const prefs = this.loadPrefs();
    this.open.set(prefs.open);
    this.widgetOffset.set({ x: prefs.offsetX, y: prefs.offsetY });

    effect(() => {
      const conv = this.conversation();
      const opened = this.open();
      const count = conv?.messages.length ?? 0;
      const last = count > 0 ? conv?.messages[count - 1] : null;
      this.chat.revision();
      if (!this.readyForMessageWatch) {
        this.readyForMessageWatch = true;
        this.knownMessageCount = count;
        return;
      }
      if (count > this.knownMessageCount && last?.authorRole === 'staff') {
        this.chat.playCustomerReply();
        if (!opened) this.hasUnreadReply.set(true);
      }
      this.knownMessageCount = count;
      if (opened) this.hasUnreadReply.set(false);
    });

    effect(() => {
      const conv = this.conversation();
      const opened = this.open();
      this.chat.revision();
      if (!opened || !conv) return;
      this.messageScroll.onMessagesChanged(conv.messages, 'guest');
    });

    effect(() => {
      if (!this.open()) return;
      this.messageScroll.queueScrollToBottom();
    });

    effect(() => {
      this.persistPrefs({
        open: this.open(),
        offsetX: this.widgetOffset().x,
        offsetY: this.widgetOffset().y,
      });
    });

    effect(() => {
      this.open();
      this.widgetOffset();
      this.queueEnsureVisible();
      this.queuePanelLayout();
    });

    effect(() => {
      this.showApptForm();
      this.queuePanelLayout();
    });

    effect(() => {
      const date = this.apptDate();
      if (this.showApptForm() && date) void this.loadApptSlots(date);
    });

    if (typeof window !== 'undefined') {
      const onPointerMove = (event: PointerEvent) => this.handleDragMove(event);
      const onPointerUp = (event: PointerEvent) => this.handleDragEnd(event);
      const onResize = () => {
        this.queueEnsureVisible();
        this.queuePanelLayout();
      };
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
      window.addEventListener('resize', onResize);
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        window.removeEventListener('resize', onResize);
        if (this.ensureVisibleFrame) window.cancelAnimationFrame(this.ensureVisibleFrame);
        if (this.panelLayoutFrame) window.cancelAnimationFrame(this.panelLayoutFrame);
      });
    }
  }

  toggleOpen(): void {
    if (this.suppressToggleClick) return;
    this.open.update((value) => {
      const next = !value;
      if (next) {
        this.hasUnreadReply.set(false);
        this.messageScroll.reset();
      }
      return next;
    });
    this.error.set('');
  }

  onMessagesScroll(): void {
    this.messageScroll.onScroll();
  }

  jumpToLatestMessage(): void {
    this.messageScroll.jumpToLatest();
  }

  startNewChat(): void {
    this.chat.clearGuestConversation();
    this.messageScroll.reset();
    this.showApptForm.set(false);
    this.messageDraft.set('');
    this.firstMessage.set('');
    this.error.set('');
    this.knownMessageCount = 0;
    this.readyForMessageWatch = false;
  }

  toggleApptForm(): void {
    this.showApptForm.update((value) => !value);
  }

  sendQuickMessage(text: string): void {
    const err = this.chat.sendGuestMessage(text);
    if (err) this.error.set(err);
    else {
      this.error.set('');
      this.messageScroll.queueScrollToBottom();
    }
  }

  startGuestChat(): void {
    const err = this.chat.startGuestConversation(this.guestName(), this.firstMessage());
    if (err) {
      this.error.set(err);
      return;
    }
    this.error.set('');
    this.firstMessage.set('');
    this.messageDraft.set('');
    this.messageScroll.queueScrollToBottom();
  }

  sendMessage(): void {
    const err = this.chat.sendGuestMessage(this.messageDraft());
    if (err) {
      this.error.set(err);
      return;
    }
    this.error.set('');
    this.messageDraft.set('');
    this.messageScroll.queueScrollToBottom();
  }

  async sendAppointment(): Promise<void> {
    const service = this.services().find((s) => s.id === this.apptServiceId());
    if (!service) return;
    this.apptBusy.set(true);
    this.error.set('');
    const err = await this.chat.sendGuestAppointmentRequest({
      serviceId: service.id,
      serviceName: service.title,
      price: service.fromPrice,
      date: this.apptDate(),
      slot: this.apptSlot(),
    });
    this.apptBusy.set(false);
    if (err) {
      this.error.set(err);
      return;
    }
    this.showApptForm.set(false);
  }

  async onRespond(event: { messageId: string; accept: boolean }): Promise<void> {
    const conv = this.conversation();
    if (!conv) return;
    this.apptBusy.set(true);
    this.error.set('');
    const err = await this.chat.respondToAppointment(conv.id, event.messageId, event.accept, 'guest');
    this.apptBusy.set(false);
    if (err) this.error.set(err);
  }

  syncGuestName(value: string): void {
    this.guestName.set(value);
    this.chat.updateGuestName(value);
  }

  selectedServicePrice(): string {
    const s = this.services().find((x) => x.id === this.apptServiceId());
    return s ? this.chat.formatPrice(s.fromPrice) : '';
  }

  startBubbleDrag(event: PointerEvent): void {
    this.beginDrag(event);
  }

  startPanelDrag(event: PointerEvent): void {
    this.beginDrag(event);
  }

  private defaultApptDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  private async loadApptSlots(date: string): Promise<void> {
    this.apptSlotsLoading.set(true);
    const slots = await this.booking.loadSlots(date);
    const available = slots.filter((s) => s.available);
    this.apptSlots.set(available);
    if (!available.some((s) => s.time === this.apptSlot())) {
      const first = available[0];
      if (first) this.apptSlot.set(first.time);
    }
    this.apptSlotsLoading.set(false);
  }

  private beginDrag(event: PointerEvent): void {
    if (event.button !== 0) return;
    this.dragPointerId = event.pointerId;
    this.dragStartedAt = { x: event.clientX, y: event.clientY };
    this.dragBaseOffset = { ...this.widgetOffset() };
    this.dragHasMoved = false;
    this.isDragging.set(false);
    const source = event.currentTarget as Element | null;
    source?.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  private handleDragMove(event: PointerEvent): void {
    if (this.dragPointerId === null || this.dragPointerId !== event.pointerId) return;
    const dx = event.clientX - this.dragStartedAt.x;
    const dy = event.clientY - this.dragStartedAt.y;
    if (!this.dragHasMoved && Math.hypot(dx, dy) > 4) {
      this.dragHasMoved = true;
      this.isDragging.set(true);
    }
    if (!this.dragHasMoved) return;
    this.widgetOffset.set({ x: this.dragBaseOffset.x + dx, y: this.dragBaseOffset.y + dy });
    this.queueEnsureVisible();
    this.queuePanelLayout();
  }

  private handleDragEnd(event: PointerEvent): void {
    if (this.dragPointerId === null || this.dragPointerId !== event.pointerId) return;
    this.dragPointerId = null;
    this.isDragging.set(false);
    if (this.dragHasMoved) {
      this.suppressToggleClick = true;
      window.setTimeout(() => {
        this.suppressToggleClick = false;
      }, 0);
    }
    this.dragHasMoved = false;
    this.queueEnsureVisible();
    this.queuePanelLayout();
  }

  private queueEnsureVisible(): void {
    if (typeof window === 'undefined') return;
    if (this.ensureVisibleFrame) return;
    this.ensureVisibleFrame = window.requestAnimationFrame(() => {
      this.ensureVisibleFrame = 0;
      this.ensureBubbleVisible();
    });
  }

  private ensureBubbleVisible(): void {
    if (typeof window === 'undefined') return;
    const bubble = this.chatBubble?.nativeElement;
    if (!bubble) return;
    const rect = bubble.getBoundingClientRect();
    const margin = 0;
    let shiftX = 0;
    let shiftY = 0;
    if (rect.left < margin) shiftX = margin - rect.left;
    else if (rect.right > window.innerWidth - margin) shiftX = window.innerWidth - margin - rect.right;
    if (rect.top < margin) shiftY = margin - rect.top;
    else if (rect.bottom > window.innerHeight - margin) shiftY = window.innerHeight - margin - rect.bottom;
    if (shiftX === 0 && shiftY === 0) return;
    this.widgetOffset.update((current) => ({ x: current.x + shiftX, y: current.y + shiftY }));
  }

  private queuePanelLayout(): void {
    if (typeof window === 'undefined' || !this.open()) return;
    if (this.panelLayoutFrame) return;
    this.panelLayoutFrame = window.requestAnimationFrame(() => {
      this.panelLayoutFrame = 0;
      this.updatePanelLayout();
    });
  }

  private updatePanelLayout(): void {
    if (typeof window === 'undefined' || !this.open()) return;
    const root = this.chatWidgetRoot?.nativeElement;
    const bubble = this.chatBubble?.nativeElement;
    if (!root || !bubble) return;
    const rootRect = root.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const panelEl = this.chatPanel?.nativeElement;
    const fallbackWidth = Math.min(378, window.innerWidth - 16);
    const margin = 8;
    const gap = 10;
    const panelWidth = panelEl?.offsetWidth ?? fallbackWidth;
    const targetHeight = Math.min(560, Math.max(320, window.innerHeight - margin * 2));
    if (!panelEl) this.queuePanelLayout();
    const horizontal: 'left' | 'right' = bubbleRect.left < window.innerWidth / 2 ? 'left' : 'right';
    const vertical: 'up' | 'down' = bubbleRect.top < window.innerHeight / 2 ? 'down' : 'up';
    const placement = `${vertical}-${horizontal}` as FwChatPanelPlacement;
    let left = horizontal === 'left' ? bubbleRect.left : bubbleRect.right - panelWidth;
    let top = vertical === 'up' ? bubbleRect.top - targetHeight - gap : bubbleRect.bottom + gap;
    left = Math.min(window.innerWidth - panelWidth - margin, Math.max(margin, left));
    top = Math.min(window.innerHeight - targetHeight - margin, Math.max(margin, top));
    this.panelPlacement.set(placement);
    this.panelStyle.set({
      left: left - rootRect.left,
      top: top - rootRect.top,
      maxHeight: targetHeight,
      height: targetHeight,
    });
  }

  private loadPrefs(): FwChatWidgetPrefs {
    const fallback: FwChatWidgetPrefs = { open: false, offsetX: 0, offsetY: 0 };
    if (typeof localStorage === 'undefined') return fallback;
    try {
      const raw = localStorage.getItem(FW_CHAT_WIDGET_PREFS_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as Partial<FwChatWidgetPrefs>;
      return {
        open: parsed.open === true,
        offsetX: Number.isFinite(parsed.offsetX) ? Number(parsed.offsetX) : 0,
        offsetY: Number.isFinite(parsed.offsetY) ? Number(parsed.offsetY) : 0,
      };
    } catch {
      return fallback;
    }
  }

  private persistPrefs(prefs: FwChatWidgetPrefs): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(FW_CHAT_WIDGET_PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }
}
