import { Injectable, inject } from '@angular/core';
import { DogAuthService } from './dog-auth.service';

export type DogSpotComment = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
};

export type DogSpotSocial = {
  comments: DogSpotComment[];
  upvotes: string[];
  downvotes: string[];
  score: number;
  userVote: 'up' | 'down' | null;
};

export type DogSpotReportResult = {
  ok: boolean;
  blocked: boolean;
  reportCount: number;
  alreadyReported: boolean;
  error?: string;
};

export type DogSpotMetaBatch = {
  communityIds: string[];
  blockedIds: string[];
};

@Injectable({ providedIn: 'root' })
export class DogSpotSocialService {
  private readonly auth = inject(DogAuthService);

  private headers(): Record<string, string> {
    const token = this.auth.sessionToken();
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }

  async loadSpotMetaBatch(spotIds: string[]): Promise<DogSpotMetaBatch> {
    if (!spotIds.length) return { communityIds: [], blockedIds: [] };
    try {
      const res = await fetch(`/api/spots/social/batch?ids=${encodeURIComponent(spotIds.join(','))}`);
      if (!res.ok) return { communityIds: [], blockedIds: [] };
      const data = (await res.json()) as { ids?: string[]; blockedIds?: string[] };
      return { communityIds: data.ids ?? [], blockedIds: data.blockedIds ?? [] };
    } catch {
      return { communityIds: [], blockedIds: [] };
    }
  }

  async loadCommunityIds(spotIds: string[]): Promise<string[]> {
    const batch = await this.loadSpotMetaBatch(spotIds);
    return batch.communityIds;
  }

  async report(spotId: string): Promise<DogSpotReportResult> {
    const res = await fetch(`/api/spots/${encodeURIComponent(spotId)}/report`, {
      method: 'POST',
      headers: this.headers(),
    });
    const data = (await res.json().catch(() => ({}))) as DogSpotReportResult;
    if (!res.ok) {
      return { ok: false, blocked: false, reportCount: 0, alreadyReported: false, error: data.error ?? 'Meldung fehlgeschlagen' };
    }
    return data;
  }

  async load(spotId: string): Promise<DogSpotSocial> {
    const empty: DogSpotSocial = { comments: [], upvotes: [], downvotes: [], score: 0, userVote: null };
    try {
      const res = await fetch(`/api/spots/${encodeURIComponent(spotId)}/social`, { headers: this.headers() });
      if (!res.ok) return empty;
      return (await res.json()) as DogSpotSocial;
    } catch {
      return empty;
    }
  }

  async comment(spotId: string, text: string): Promise<DogSpotSocial | null> {
    const res = await fetch(`/api/spots/${encodeURIComponent(spotId)}/social/comment`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    return (await res.json()) as DogSpotSocial;
  }

  async vote(spotId: string, direction: 'up' | 'down'): Promise<DogSpotSocial | null> {
    const res = await fetch(`/api/spots/${encodeURIComponent(spotId)}/social/vote`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) return null;
    return (await res.json()) as DogSpotSocial;
  }
}
