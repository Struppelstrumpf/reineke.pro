import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import type { FwChatAuthorRole, FwChatMessage } from '../../fusswerk-chat.types';
import { FusswerkChatService } from '../../fusswerk-chat.service';

@Component({
  selector: 'pv-fw-chat-message',
  imports: [DatePipe],
  templateUrl: './fw-chat-message.component.html',
  styleUrl: './fw-chat-message.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwChatMessageComponent {
  readonly chat = inject(FusswerkChatService);

  readonly message = input.required<FwChatMessage>();
  readonly viewerRole = input.required<FwChatAuthorRole>();
  readonly isSelf = input(false);

  readonly respond = output<{ messageId: string; accept: boolean }>();

  canRespond(): boolean {
    return this.chat.canRespondToAppointment(this.message(), this.viewerRole());
  }

  formatPrice(value: number): string {
    return this.chat.formatPrice(value);
  }

  formatDate(date: string, slot: string): string {
    return this.chat.formatGermanDate(date, slot);
  }

  statusLabel(): string {
    const appt = this.message().appointment;
    const s = appt?.status;
    if (s === 'confirmed') return 'Bestätigt';
    if (s === 'declined') return 'Abgelehnt';
    if (s === 'pending' && appt?.bookingId && appt.proposedBy === 'staff') {
      return 'Wartet auf Kundenbestätigung';
    }
    return 'Offen';
  }
}
