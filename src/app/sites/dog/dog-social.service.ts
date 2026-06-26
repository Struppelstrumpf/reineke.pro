import { Injectable, computed, inject, signal } from '@angular/core';
import { DogAuthService } from './dog-auth.service';
import type {
  DogLocationShare,
  DogMeetup,
  DogMeetupDraft,
  DogNearbyUser,
  DogNotification,
  DogProfileDog,
  DogSocialState,
  FriendsHubTab,
} from './dog-social.types';

@Injectable({ providedIn: 'root' })
export class DogSocialService {
  private readonly auth = inject(DogAuthService);

  readonly hubOpen = signal(false);
  readonly hubTab = signal<FriendsHubTab>('discover');
  readonly profileOpen = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly social = signal<DogSocialState>({ friends: [], requestsIn: [], requestsOut: [] });
  readonly dogs = signal<DogProfileDog[]>([]);
  readonly notifications = signal<DogNotification[]>([]);
  readonly unread = signal(0);
  readonly share = signal<DogLocationShare | null>(null);
  readonly meetups = signal<DogMeetup[]>([]);
  readonly nearby = signal<DogNearbyUser[]>([]);
  readonly meetupDraft = signal<DogMeetupDraft | null>(null);
  readonly selectedNearby = signal<DogNearbyUser | null>(null);

  readonly shareActive = computed(() => {
    const s = this.share();
    return Boolean(s && new Date(s.expiresAt).getTime() > Date.now());
  });

  readonly shareMinutesLeft = computed(() => {
    const s = this.share();
    if (!s) return 0;
    return Math.max(0, Math.ceil((new Date(s.expiresAt).getTime() - Date.now()) / 60_000));
  });

  openHub(tab: FriendsHubTab = 'discover'): void {
    this.hubTab.set(tab);
    this.hubOpen.set(true);
    this.error.set(null);
    void this.refresh();
  }

  closeHub(): void {
    this.hubOpen.set(false);
    this.selectedNearby.set(null);
    this.meetupDraft.set(null);
  }

  openProfile(): void {
    this.auth.menuOpen.set(false);
    this.profileOpen.set(true);
    this.error.set(null);
  }

  closeProfile(): void {
    this.profileOpen.set(false);
  }

  openMeetupForSpot(draft: DogMeetupDraft): void {
    this.meetupDraft.set(draft);
    this.openHub('meetups');
  }

  async refresh(lat?: number, lng?: number): Promise<void> {
    const token = this.auth.sessionToken();
    if (!token) return;
    this.loading.set(true);
    try {
      const res = await fetch('/api/social/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as {
        social?: DogSocialState;
        dogs?: DogProfileDog[];
        notifications?: DogNotification[];
        unread?: number;
        share?: DogLocationShare | null;
        meetups?: DogMeetup[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? 'Laden fehlgeschlagen');
      if (data.social) this.social.set(data.social);
      if (data.dogs) this.dogs.set(data.dogs);
      if (data.notifications) this.notifications.set(data.notifications);
      this.unread.set(data.unread ?? 0);
      this.share.set(data.share ?? null);
      if (data.meetups) this.meetups.set(data.meetups);
      if (lat != null && lng != null) await this.loadNearby(lat, lng);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Laden fehlgeschlagen');
    } finally {
      this.loading.set(false);
    }
  }

  async loadNearby(lat: number, lng: number): Promise<void> {
    const token = this.auth.sessionToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/social/nearby?lat=${lat}&lng=${lng}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as { nearby?: DogNearbyUser[] };
      if (res.ok && data.nearby) this.nearby.set(data.nearby);
    } catch {
      /* optional */
    }
  }

  async enableShare(lat: number, lng: number, radiusKm: number): Promise<boolean> {
    const token = this.auth.sessionToken();
    if (!token) return false;
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch('/api/social/share', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, radiusKm }),
      });
      const data = (await res.json().catch(() => ({}))) as { share?: DogLocationShare; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Freigabe fehlgeschlagen');
      this.share.set(data.share ?? null);
      await this.loadNearby(lat, lng);
      return true;
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Freigabe fehlgeschlagen');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async disableShare(): Promise<void> {
    const token = this.auth.sessionToken();
    if (!token) return;
    await fetch('/api/social/share', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    this.share.set(null);
    this.nearby.set([]);
  }

  async saveDog(dog: Partial<DogProfileDog> & { id?: string }): Promise<boolean> {
    const token = this.auth.sessionToken();
    if (!token) return false;
    this.loading.set(true);
    this.error.set(null);
    try {
      const isNew = !dog.id;
      const res = await fetch('/api/social/dogs', {
        method: isNew ? 'POST' : 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(dog),
      });
      const data = (await res.json().catch(() => ({}))) as { dogs?: DogProfileDog[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Speichern fehlgeschlagen');
      if (data.dogs) this.dogs.set(data.dogs);
      return true;
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Speichern fehlgeschlagen');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async deleteDog(id: string): Promise<void> {
    const token = this.auth.sessionToken();
    if (!token) return;
    const res = await fetch('/api/social/dogs', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = (await res.json()) as { dogs?: DogProfileDog[] };
    if (data.dogs) this.dogs.set(data.dogs);
  }

  async sendFriendRequest(targetUserId: string): Promise<void> {
    const token = this.auth.sessionToken();
    if (!token) return;
    const res = await fetch('/api/social/friends/request', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId }),
    });
    const data = (await res.json().catch(() => ({}))) as { social?: DogSocialState; error?: string };
    if (!res.ok) throw new Error(data.error ?? 'Anfrage fehlgeschlagen');
    if (data.social) this.social.set(data.social);
    this.nearby.update((list) =>
      list.map((u) => (u.id === targetUserId ? { ...u, requestPending: true } : u)),
    );
  }

  async respondFriendRequest(requestId: string, accept: boolean): Promise<void> {
    const token = this.auth.sessionToken();
    if (!token) return;
    const res = await fetch('/api/social/friends/respond', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, accept }),
    });
    const data = (await res.json()) as { social?: DogSocialState };
    if (data.social) this.social.set(data.social);
    await this.refresh();
  }

  async createMeetup(payload: {
    spotId: string;
    spotName: string;
    lat: number;
    lng: number;
    scheduledAt: string;
    message: string;
    inviteUserIds: string[];
  }): Promise<boolean> {
    const token = this.auth.sessionToken();
    if (!token) return false;
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch('/api/social/meetups', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { meetup?: DogMeetup; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Treffen fehlgeschlagen');
      if (data.meetup) this.meetups.update((m) => [data.meetup!, ...m]);
      this.meetupDraft.set(null);
      return true;
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Treffen fehlgeschlagen');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async respondMeetup(meetupId: string, accept: boolean): Promise<void> {
    const token = this.auth.sessionToken();
    if (!token) return;
    await fetch('/api/social/meetups/respond', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetupId, accept }),
    });
    await this.refresh();
  }

  async markNotificationsRead(ids: string[] = []): Promise<void> {
    const token = this.auth.sessionToken();
    if (!token) return;
    const res = await fetch('/api/social/notifications/read', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    const data = (await res.json()) as { notifications?: DogNotification[]; unread?: number };
    if (data.notifications) this.notifications.set(data.notifications);
    this.unread.set(data.unread ?? 0);
  }

  async changeEmail(newEmail: string, password: string): Promise<boolean> {
    const token = this.auth.sessionToken();
    if (!token) return false;
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch('/api/auth/profile/email', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { user?: { email: string; name: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Änderung fehlgeschlagen');
      if (data.user) this.auth.user.update((u) => (u ? { ...u, email: data.user!.email } : u));
      return true;
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Änderung fehlgeschlagen');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    const token = this.auth.sessionToken();
    if (!token) return false;
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch('/api/auth/profile/password', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Änderung fehlgeschlagen');
      return true;
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Änderung fehlgeschlagen');
      return false;
    } finally {
      this.loading.set(false);
    }
  }
}
