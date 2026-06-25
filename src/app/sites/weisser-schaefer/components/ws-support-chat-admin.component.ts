import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import type { WsOrder } from '../weisser-schaefer.data';
import { wsOrderStatusOptionLabel } from '../weisser-schaefer.data';
import { WeisserSchaeferAuthService } from '../weisser-schaefer-auth.service';
import { WeisserSchaeferChatService } from '../weisser-schaefer-chat.service';
import { WeisserSchaeferSessionService } from '../weisser-schaefer-session.service';

@Component({
  selector: 'pv-ws-support-chat-admin',
  imports: [DatePipe],
  templateUrl: './ws-support-chat-admin.component.html',
  styleUrls: ['../ws-shared.scss', './ws-support-chat-admin.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WsSupportChatAdminComponent {
  readonly auth = inject(WeisserSchaeferAuthService);
  readonly chat = inject(WeisserSchaeferChatService);
  readonly session = inject(WeisserSchaeferSessionService);
  readonly orderStatusOptionLabel = wsOrderStatusOptionLabel;

  readonly selectedConversationId = signal<string | null>(null);
  readonly replyText = signal('');
  readonly orderSearch = signal('');
  readonly orderStatus = signal<'alle' | WsOrder['status']>('alle');
  readonly audioSettingsOpen = signal(false);

  readonly conversations = computed(() => this.chat.openConversations());
  readonly audioSettings = computed(() => this.chat.audioSettings());
  readonly canManageAudioSettings = computed(() => this.auth.isAdmin());
  readonly selectedConversation = computed(() => {
    const selected = this.selectedConversationId();
    if (selected) {
      const byId = this.chat.conversationById(selected);
      if (byId && byId.open) {
        return byId;
      }
    }
    return this.conversations()[0] ?? null;
  });

  readonly relatedOrders = computed(() => {
    const conversation = this.selectedConversation();
    if (!conversation?.companyName) {
      return [];
    }
    const q = this.orderSearch().trim().toLowerCase();
    const status = this.orderStatus();
    return this.session
      .allOrders()
      .filter((order) => order.customer === conversation.companyName)
      .filter((order) => status === 'alle' || order.status === status)
      .filter(
        (order) =>
          !q ||
          order.id.toLowerCase().includes(q) ||
          order.lines.some((line) => line.name.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  constructor() {
    effect(() => {
      const selected = this.selectedConversation();
      if (selected && this.selectedConversationId() !== selected.id) {
        this.selectedConversationId.set(selected.id);
      }
    });
  }

  selectConversation(conversationId: string): void {
    this.selectedConversationId.set(conversationId);
  }

  closeSelectedConversation(): void {
    const selected = this.selectedConversation();
    if (!selected) {
      return;
    }
    this.chat.setConversationOpen(selected.id, false);
    this.selectedConversationId.set(null);
  }

  sendReply(): void {
    const selected = this.selectedConversation();
    if (!selected) {
      return;
    }
    const err = this.chat.sendStaffReply(selected.id, this.replyText());
    if (err) {
      this.session.showToast(err);
      return;
    }
    this.replyText.set('');
  }

  setStaffNotificationVolume(raw: string): void {
    if (!this.canManageAudioSettings()) {
      return;
    }
    this.chat.setStaffNotificationVolume(Number(raw));
  }

  setCustomerReplyVolume(raw: string): void {
    if (!this.canManageAudioSettings()) {
      return;
    }
    this.chat.setCustomerReplyVolume(Number(raw));
  }

  previewStaffSound(): void {
    if (!this.canManageAudioSettings()) {
      return;
    }
    this.chat.playStaffNotification();
  }

  previewCustomerSound(): void {
    if (!this.canManageAudioSettings()) {
      return;
    }
    this.chat.playCustomerReply();
  }

  clearStaffSound(): void {
    if (!this.canManageAudioSettings()) {
      return;
    }
    this.chat.setStaffNotificationSoundDataUrl(undefined);
    this.session.showToast('Eigenes Pling zurückgesetzt. Standardton aktiv.');
  }

  async uploadStaffSound(event: Event): Promise<void> {
    if (!this.canManageAudioSettings()) {
      return;
    }
    const target = event.target as HTMLInputElement | null;
    const file = target?.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('audio/')) {
      this.session.showToast('Bitte eine Audio-Datei auswählen.');
      return;
    }
    if (file.size > 2_500_000) {
      this.session.showToast('Datei zu groß (max. 2,5 MB).');
      return;
    }
    try {
      const dataUrl = await this.fileToDataUrl(file);
      this.chat.setStaffNotificationSoundDataUrl(dataUrl);
      this.session.showToast('Benachrichtigungston gespeichert.');
    } catch {
      this.session.showToast('Audio konnte nicht geladen werden.');
    } finally {
      if (target) {
        target.value = '';
      }
    }
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          resolve(result);
          return;
        }
        reject(new Error('invalid-result'));
      };
      reader.onerror = () => reject(reader.error ?? new Error('read-failed'));
      reader.readAsDataURL(file);
    });
  }

  toggleAudioSettings(): void {
    if (!this.canManageAudioSettings()) {
      return;
    }
    this.audioSettingsOpen.update((value) => !value);
  }
}
