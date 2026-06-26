import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DogExploreService } from '../dog-explore.service';
import { DogAuthService } from '../dog-auth.service';
import { DogSocialService } from '../dog-social.service';
import type { DogNearbyUser, DogProfileDog, FriendsHubTab } from '../dog-social.types';

@Component({
  selector: 'pv-dog-friends-hub',
  imports: [FormsModule, DatePipe, DecimalPipe],
  templateUrl: './dog-friends-hub.component.html',
  styleUrl: './dog-friends-hub.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogFriendsHubComponent {
  readonly auth = inject(DogAuthService);
  readonly social = inject(DogSocialService);
  readonly explore = inject(DogExploreService);

  readonly shareRadius = signal(5);
  readonly dogForm = signal<Partial<DogProfileDog>>({
    name: '',
    breed: '',
    size: 'mittel',
    weightKg: 0,
    traits: '',
  });
  readonly editingDogId = signal<string | null>(null);
  readonly meetTime = signal('');
  readonly meetMessage = signal('');
  readonly meetInviteIds = signal<string[]>([]);

  readonly tabs: { id: FriendsHubTab; label: string; icon: string }[] = [
    { id: 'discover', label: 'Entdecken', icon: '📍' },
    { id: 'dogs', label: 'Meine Hunde', icon: '🐕' },
    { id: 'friends', label: 'Freunde', icon: '🤝' },
    { id: 'meetups', label: 'Treffen', icon: '🗓' },
  ];

  switchTab(tab: FriendsHubTab): void {
    this.social.hubTab.set(tab);
    this.social.error.set(null);
    if (tab === 'discover') {
      const c = this.explore.center();
      void this.social.refresh(c.lat, c.lng);
    } else {
      void this.social.refresh();
    }
  }

  close(): void {
    this.social.closeHub();
  }

  async toggleShare(): Promise<void> {
    if (this.social.shareActive()) {
      await this.social.disableShare();
      return;
    }
    const c = this.explore.center();
    await this.social.enableShare(c.lat, c.lng, this.shareRadius());
  }

  async refreshNearby(): Promise<void> {
    const c = this.explore.center();
    await this.social.loadNearby(c.lat, c.lng);
  }

  selectNearby(user: DogNearbyUser): void {
    this.social.selectedNearby.set(this.social.selectedNearby()?.id === user.id ? null : user);
  }

  async requestFriend(userId: string): Promise<void> {
    try {
      await this.social.sendFriendRequest(userId);
    } catch (e) {
      this.social.error.set(e instanceof Error ? e.message : 'Anfrage fehlgeschlagen');
    }
  }

  async respondRequest(requestId: string, accept: boolean): Promise<void> {
    await this.social.respondFriendRequest(requestId, accept);
  }

  startNewDog(): void {
    this.editingDogId.set(null);
    this.dogForm.set({ name: '', breed: '', size: 'mittel', weightKg: 0, traits: '' });
  }

  editDog(dog: DogProfileDog): void {
    this.editingDogId.set(dog.id);
    this.dogForm.set({ ...dog });
  }

  async saveDog(): Promise<void> {
    const form = this.dogForm();
    const id = this.editingDogId();
    const ok = await this.social.saveDog(id ? { ...form, id } : form);
    if (ok) this.startNewDog();
  }

  async removeDog(id: string): Promise<void> {
    await this.social.deleteDog(id);
    if (this.editingDogId() === id) this.startNewDog();
  }

  patchDog(patch: Partial<DogProfileDog>): void {
    this.dogForm.update((f) => ({ ...f, ...patch }));
  }

  toggleMeetInvite(userId: string): void {
    this.meetInviteIds.update((ids) =>
      ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId],
    );
  }

  async submitMeetup(): Promise<void> {
    const draft = this.social.meetupDraft();
    if (!draft) {
      this.social.error.set('Wähle zuerst einen Ort auf der Karte');
      return;
    }
    const scheduledAt = this.meetTime();
    if (!scheduledAt) {
      this.social.error.set('Bitte Uhrzeit wählen');
      return;
    }
    const ok = await this.social.createMeetup({
      ...draft,
      scheduledAt: new Date(scheduledAt).toISOString(),
      message: this.meetMessage(),
      inviteUserIds: this.meetInviteIds(),
    });
    if (ok) {
      this.meetTime.set('');
      this.meetMessage.set('');
      this.meetInviteIds.set([]);
    }
  }

  async respondMeetup(meetupId: string, accept: boolean): Promise<void> {
    await this.social.respondMeetup(meetupId, accept);
  }

  async readNotifications(): Promise<void> {
    await this.social.markNotificationsRead();
  }

  meetupStatusLabel(status: string): string {
    if (status === 'accepted') return 'Zugesagt';
    if (status === 'declined') return 'Abgesagt';
    return 'Offen';
  }

  invPending(meetup: { invites: { userId: string; status: string }[] }): boolean {
    const uid = this.auth.user()?.id;
    if (!uid) return false;
    const inv = meetup.invites.find((i) => i.userId === uid);
    return Boolean(inv && inv.status === 'pending');
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.social.hubOpen()) this.close();
  }
}
