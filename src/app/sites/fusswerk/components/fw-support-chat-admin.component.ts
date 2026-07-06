import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  FW_CHAT_TEMPLATE_LABELS,
  FusswerkChatService,
  type FwChatTemplateId,
} from '../fusswerk-chat.service';
import { FusswerkBookingAdminService } from '../fusswerk-booking-admin.service';
import { FusswerkBookingService } from '../fusswerk-booking.service';
import type { FwBookingSlot } from '../fusswerk-booking.types';
import { FusswerkContentService } from '../fusswerk-content.service';
import { FwChatMessagesScroll } from '../fw-chat-messages-scroll';
import { FwChatMessageComponent } from './fw-chat-message/fw-chat-message.component';

@Component({
  selector: 'pv-fw-support-chat-admin',
  imports: [FormsModule, FwChatMessageComponent],
  templateUrl: './fw-support-chat-admin.component.html',
  styleUrls: ['../fusswerk-shared.scss', './fw-support-chat-admin.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwSupportChatAdminComponent {
  @ViewChild('messagesEl')
  private messagesEl?: ElementRef<HTMLElement>;

  readonly chat = inject(FusswerkChatService);
  readonly content = inject(FusswerkContentService);
  private readonly booking = inject(FusswerkBookingService);
  private readonly bookingAdmin = inject(FusswerkBookingAdminService);
  readonly templateLabels = FW_CHAT_TEMPLATE_LABELS;
  readonly staffTemplates: FwChatTemplateId[] = ['angebot', 'preise', 'kontakt', 'hours'];

  readonly selectedId = signal<string | null>(null);
  readonly reply = signal('');
  readonly error = signal('');
  readonly showApptForm = signal(false);
  readonly apptServiceId = signal('classic');
  readonly apptDate = signal(this.defaultDate());
  readonly apptSlot = signal('09:00');
  readonly apptBusy = signal(false);
  readonly apptSlots = signal<FwBookingSlot[]>([]);
  readonly apptSlotsLoading = signal(false);
  readonly showNewMessagesHint = signal(false);
  readonly services = this.content.services;
  readonly conversations = computed(() => this.chat.openConversations());
  readonly selected = computed(() => {
    const id = this.selectedId();
    if (id) return this.chat.conversationById(id);
    return this.conversations()[0] ?? null;
  });

  private readonly messageScroll = new FwChatMessagesScroll(
    () => this.messagesEl?.nativeElement,
    this.showNewMessagesHint,
  );
  private readyForMessageWatch = false;
  private knownMessageCount = 0;
  private knownConversationId: string | null = null;

  constructor() {
    effect(() => {
      const first = this.conversations()[0];
      if (first && !this.selectedId()) this.selectedId.set(first.id);
    });
    effect(() => {
      const date = this.apptDate();
      this.bookingAdmin.revision();
      if (date) void this.loadApptSlots(date);
    });

    effect(() => {
      const conv = this.selected();
      const count = conv?.messages.length ?? 0;
      const last = count > 0 ? conv?.messages[count - 1] : null;
      this.chat.revision();

      if (conv?.id !== this.knownConversationId) {
        this.knownConversationId = conv?.id ?? null;
        this.knownMessageCount = count;
        this.readyForMessageWatch = false;
        this.messageScroll.reset();
        this.messageScroll.queueScrollToBottom();
        return;
      }

      if (!this.readyForMessageWatch) {
        this.readyForMessageWatch = true;
        this.knownMessageCount = count;
        return;
      }

      if (count > this.knownMessageCount && last?.authorRole === 'guest') {
        this.chat.playStaffNotification();
      }
      this.knownMessageCount = count;
    });

    effect(() => {
      const conv = this.selected();
      this.chat.revision();
      if (!conv) return;
      this.messageScroll.onMessagesChanged(conv.messages, 'staff');
    });
  }

  onMessagesScroll(): void {
    this.messageScroll.onScroll();
  }

  jumpToLatestMessage(): void {
    this.messageScroll.jumpToLatest();
  }

  selectConversation(id: string): void {
    this.selectedId.set(id);
    this.messageScroll.reset();
  }

  toggleApptForm(): void {
    this.showApptForm.update((value) => !value);
  }
  sendReply(): void {
    const conv = this.selected();
    if (!conv) return;
    const err = this.chat.sendStaffReply(conv.id, this.reply());
    if (err) this.error.set(err);
    else {
      this.reply.set('');
      this.error.set('');
      this.messageScroll.queueScrollToBottom();
    }
  }

  sendTemplate(id: FwChatTemplateId): void {
    const conv = this.selected();
    if (!conv) return;
    const err = this.chat.sendStaffTemplate(conv.id, id);
    if (err) this.error.set(err);
    else this.error.set('');
  }

  async sendAppointment(): Promise<void> {
    const conv = this.selected();
    if (!conv) return;
    const service = this.services().find((s) => s.id === this.apptServiceId());
    if (!service) return;
    this.apptBusy.set(true);
    const err = await this.chat.sendStaffAppointmentProposal(conv.id, {
      serviceId: service.id,
      serviceName: service.title,
      price: service.fromPrice,
      date: this.apptDate(),
      slot: this.apptSlot(),
    });
    this.apptBusy.set(false);
    if (err) this.error.set(err);
    else {
      this.error.set('');
      this.showApptForm.set(false);
    }
  }

  async onRespond(event: { messageId: string; accept: boolean }): Promise<void> {
    const conv = this.selected();
    if (!conv) return;
    this.apptBusy.set(true);
    const err = await this.chat.respondToAppointment(conv.id, event.messageId, event.accept, 'staff');
    this.apptBusy.set(false);
    if (err) this.error.set(err);
    else this.error.set('');
  }

  closeChat(id: string): void {
    const err = this.chat.closeConversationByStaff(id);
    if (err) this.error.set(err);
    else {
      this.error.set('');
      this.selectedId.set(null);
      this.messageScroll.reset();
    }
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
  private defaultDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
}
