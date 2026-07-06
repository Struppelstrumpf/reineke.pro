import { signal, type WritableSignal } from '@angular/core';

const NEAR_BOTTOM_PX = 56;

/** Steuert Auto-Scroll und „Neue Nachricht“-Hinweis im Chatverlauf. */
export class FwChatMessagesScroll {
  readonly showNewHint: WritableSignal<boolean>;

  private stickToBottom = true;
  private knownCount = 0;
  private knownTailId = '';
  private scrollFrame = 0;
  private ready = false;

  constructor(
    private readonly getMessagesEl: () => HTMLElement | undefined,
    showNewHint?: WritableSignal<boolean>,
  ) {
    this.showNewHint = showNewHint ?? signal(false);
  }

  reset(): void {
    this.stickToBottom = true;
    this.knownCount = 0;
    this.knownTailId = '';
    this.ready = false;
    this.showNewHint.set(false);
  }

  onScroll(): void {
    this.stickToBottom = this.isNearBottom();
    if (this.stickToBottom) this.showNewHint.set(false);
  }

  onMessagesChanged(messages: { id: string; authorRole: string }[], viewerRole: string): void {
    const count = messages.length;
    const tail = count > 0 ? messages[count - 1] : null;
    const tailId = tail?.id ?? '';

    if (!this.ready) {
      this.ready = true;
      this.knownCount = count;
      this.knownTailId = tailId;
      this.queueScrollToBottom();
      return;
    }

    const grew = count > this.knownCount || tailId !== this.knownTailId;
    this.knownCount = count;
    this.knownTailId = tailId;
    if (!grew) return;

    const fromOther = tail?.authorRole !== viewerRole;
    if (!fromOther || this.stickToBottom) {
      this.queueScrollToBottom();
      this.showNewHint.set(false);
      return;
    }

    this.showNewHint.set(true);
  }

  jumpToLatest(): void {
    this.scrollToBottom();
  }

  queueScrollToBottom(): void {
    if (typeof window === 'undefined') return;
    if (this.scrollFrame) window.cancelAnimationFrame(this.scrollFrame);
    this.scrollFrame = window.requestAnimationFrame(() => {
      this.scrollFrame = 0;
      this.scrollToBottom();
    });
  }

  private scrollToBottom(): void {
    const el = this.getMessagesEl();
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    this.stickToBottom = true;
    this.showNewHint.set(false);
  }

  private isNearBottom(): boolean {
    const el = this.getMessagesEl();
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX;
  }
}
