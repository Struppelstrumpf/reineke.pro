import { DatePipe } from '@angular/common';
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
import { WeisserSchaeferAuthService } from '../weisser-schaefer-auth.service';
import { WeisserSchaeferChatService } from '../weisser-schaefer-chat.service';

const WS_CHAT_WIDGET_PREFS_KEY = 'ws-demo-support-chat-widget-v1';

type WsChatWidgetPrefs = {
  open: boolean;
  offsetX: number;
  offsetY: number;
};

type WsChatPanelPlacement = 'up-left' | 'up-right' | 'down-left' | 'down-right';

@Component({
  selector: 'pv-ws-support-chat-widget',
  imports: [DatePipe],
  templateUrl: './ws-support-chat-widget.component.html',
  styleUrls: ['../ws-shared.scss', './ws-support-chat-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WsSupportChatWidgetComponent {
  @ViewChild('chatWidgetRoot')
  private chatWidgetRoot?: ElementRef<HTMLElement>;

  @ViewChild('chatBubble')
  private chatBubble?: ElementRef<HTMLButtonElement>;
  @ViewChild('chatPanel')
  private chatPanel?: ElementRef<HTMLElement>;

  readonly auth = inject(WeisserSchaeferAuthService);
  readonly chat = inject(WeisserSchaeferChatService);
  private readonly destroyRef = inject(DestroyRef);

  readonly open = signal(false);
  readonly widgetOffset = signal({ x: 0, y: 0 });
  readonly isDragging = signal(false);
  readonly panelPlacement = signal<WsChatPanelPlacement>('up-right');
  readonly panelStyle = signal({ left: 12, top: 12, maxHeight: 540 });
  readonly guestName = signal(this.chat.guestName());
  readonly firstMessage = signal('');
  readonly messageDraft = signal('');
  readonly error = signal('');
  readonly hasUnreadReply = signal(false);
  private dragPointerId: number | null = null;
  private dragStartedAt = { x: 0, y: 0 };
  private dragBaseOffset = { x: 0, y: 0 };
  private dragHasMoved = false;
  private suppressToggleClick = false;
  private ensureVisibleFrame = 0;
  private panelLayoutFrame = 0;
  private readyForMessageWatch = false;
  private knownMessageCount = 0;

  readonly customerProfile = computed(() => {
    const user = this.auth.currentUser();
    return user?.role === 'customer' ? user : null;
  });

  readonly conversation = computed(() => this.chat.myConversation());

  constructor() {
    const prefs = this.loadPrefs();
    this.open.set(prefs.open);
    this.widgetOffset.set({
      x: prefs.offsetX,
      y: prefs.offsetY,
    });

    effect(() => {
      const conv = this.conversation();
      const opened = this.open();
      const count = conv?.messages.length ?? 0;
      const last = count > 0 ? conv?.messages[count - 1] : null;
      if (!this.readyForMessageWatch) {
        this.readyForMessageWatch = true;
        this.knownMessageCount = count;
        return;
      }
      if (count > this.knownMessageCount && last?.authorRole === 'staff') {
        this.chat.playCustomerReply();
        if (!opened) {
          this.hasUnreadReply.set(true);
        }
      }
      this.knownMessageCount = count;
      if (opened) {
        this.hasUnreadReply.set(false);
      }
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
        if (this.ensureVisibleFrame) {
          window.cancelAnimationFrame(this.ensureVisibleFrame);
          this.ensureVisibleFrame = 0;
        }
        if (this.panelLayoutFrame) {
          window.cancelAnimationFrame(this.panelLayoutFrame);
          this.panelLayoutFrame = 0;
        }
      });
    }
  }

  toggleOpen(): void {
    if (this.suppressToggleClick) {
      return;
    }
    this.open.update((value) => {
      const next = !value;
      if (next) {
        this.hasUnreadReply.set(false);
      }
      return next;
    });
    this.error.set('');
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
  }

  sendMessage(): void {
    const customer = this.customerProfile();
    const text = this.messageDraft();
    const err = customer ? this.chat.sendCustomerMessage(text) : this.chat.sendGuestMessage(text);
    if (err) {
      this.error.set(err);
      return;
    }
    this.error.set('');
    this.messageDraft.set('');
  }

  syncGuestName(value: string): void {
    this.guestName.set(value);
    this.chat.updateGuestName(value);
  }

  startBubbleDrag(event: PointerEvent): void {
    this.beginDrag(event);
  }

  startPanelDrag(event: PointerEvent): void {
    this.beginDrag(event);
  }

  private beginDrag(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }
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
    if (this.dragPointerId === null || this.dragPointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - this.dragStartedAt.x;
    const dy = event.clientY - this.dragStartedAt.y;
    if (!this.dragHasMoved && Math.hypot(dx, dy) > 4) {
      this.dragHasMoved = true;
      this.isDragging.set(true);
    }
    if (!this.dragHasMoved) {
      return;
    }
    this.widgetOffset.set({
      x: this.dragBaseOffset.x + dx,
      y: this.dragBaseOffset.y + dy,
    });
    this.queueEnsureVisible();
    this.queuePanelLayout();
  }

  private handleDragEnd(event: PointerEvent): void {
    if (this.dragPointerId === null || this.dragPointerId !== event.pointerId) {
      return;
    }
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
    if (typeof window === 'undefined') {
      return;
    }
    if (this.ensureVisibleFrame) {
      return;
    }
    this.ensureVisibleFrame = window.requestAnimationFrame(() => {
      this.ensureVisibleFrame = 0;
      this.ensureBubbleVisible();
    });
  }

  private ensureBubbleVisible(): void {
    if (typeof window === 'undefined') {
      return;
    }
    const bubble = this.chatBubble?.nativeElement;
    if (!bubble) {
      return;
    }
    const rect = bubble.getBoundingClientRect();
    const margin = 0;
    const minLeft = margin;
    const maxRight = window.innerWidth - margin;
    const minTop = margin;
    const maxBottom = window.innerHeight - margin;

    let shiftX = 0;
    let shiftY = 0;
    if (rect.left < minLeft) {
      shiftX = minLeft - rect.left;
    } else if (rect.right > maxRight) {
      shiftX = maxRight - rect.right;
    }
    if (rect.top < minTop) {
      shiftY = minTop - rect.top;
    } else if (rect.bottom > maxBottom) {
      shiftY = maxBottom - rect.bottom;
    }
    if (shiftX === 0 && shiftY === 0) {
      return;
    }

    this.widgetOffset.update((current) => ({
      x: current.x + shiftX,
      y: current.y + shiftY,
    }));
  }

  private queuePanelLayout(): void {
    if (typeof window === 'undefined' || !this.open()) {
      return;
    }
    if (this.panelLayoutFrame) {
      return;
    }
    this.panelLayoutFrame = window.requestAnimationFrame(() => {
      this.panelLayoutFrame = 0;
      this.updatePanelLayout();
    });
  }

  private updatePanelLayout(): void {
    if (typeof window === 'undefined' || !this.open()) {
      return;
    }
    const root = this.chatWidgetRoot?.nativeElement;
    const bubble = this.chatBubble?.nativeElement;
    if (!root || !bubble) {
      return;
    }

    const rootRect = root.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const panelEl = this.chatPanel?.nativeElement;
    const fallbackWidth = Math.min(378, window.innerWidth - 16);
    const fallbackHeight = Math.min(560, window.innerHeight - 16);
    const panelWidth = panelEl?.offsetWidth ?? fallbackWidth;
    const panelHeight = panelEl?.offsetHeight ?? fallbackHeight;
    if (!panelEl) {
      this.queuePanelLayout();
    }

    const horizontal: 'left' | 'right' = bubbleRect.left < window.innerWidth / 2 ? 'left' : 'right';
    const vertical: 'up' | 'down' = bubbleRect.top < window.innerHeight / 2 ? 'down' : 'up';
    const placement = `${vertical}-${horizontal}` as WsChatPanelPlacement;

    const gap = 10;
    const margin = 8;
    let left = horizontal === 'left' ? bubbleRect.left : bubbleRect.right - panelWidth;
    let top = vertical === 'up' ? bubbleRect.top - panelHeight - gap : bubbleRect.bottom + gap;

    left = Math.min(window.innerWidth - panelWidth - margin, Math.max(margin, left));
    top = Math.min(window.innerHeight - panelHeight - margin, Math.max(margin, top));

    this.panelPlacement.set(placement);
    this.panelStyle.set({
      left: left - rootRect.left,
      top: top - rootRect.top,
      maxHeight: Math.max(220, window.innerHeight - margin * 2),
    });
  }

  private loadPrefs(): WsChatWidgetPrefs {
    const fallback: WsChatWidgetPrefs = { open: false, offsetX: 0, offsetY: 0 };
    if (typeof localStorage === 'undefined') {
      return fallback;
    }
    try {
      const raw = localStorage.getItem(WS_CHAT_WIDGET_PREFS_KEY);
      if (!raw) {
        return fallback;
      }
      const parsed = JSON.parse(raw) as Partial<WsChatWidgetPrefs>;
      return {
        open: parsed.open === true,
        offsetX: Number.isFinite(parsed.offsetX) ? Number(parsed.offsetX) : 0,
        offsetY: Number.isFinite(parsed.offsetY) ? Number(parsed.offsetY) : 0,
      };
    } catch {
      return fallback;
    }
  }

  private persistPrefs(prefs: WsChatWidgetPrefs): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(WS_CHAT_WIDGET_PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // ignore storage quota errors
    }
  }
}
