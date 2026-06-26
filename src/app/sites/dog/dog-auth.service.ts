import { Injectable, signal } from '@angular/core';
import type { DogAuthProvider, DogAuthUser, DogPetState } from './dog-pet.types';

const SESSION_KEY = 'nasebaer-session-token';

export type AuthSheetMode = 'login' | 'register';

@Injectable({ providedIn: 'root' })
export class DogAuthService {
  readonly user = signal<DogAuthUser | null>(null);
  readonly loading = signal(false);
  readonly menuOpen = signal(false);
  readonly sheetOpen = signal(false);
  readonly sheetMode = signal<AuthSheetMode>('login');
  readonly error = signal<string | null>(null);

  sessionToken(): string | null {
    return sessionStorage.getItem(SESSION_KEY);
  }

  constructor() {
    void this.restoreSession();
  }

  openSheet(mode: AuthSheetMode = 'login'): void {
    this.error.set(null);
    this.sheetMode.set(mode);
    this.sheetOpen.set(true);
    this.menuOpen.set(false);
  }

  closeSheet(): void {
    this.sheetOpen.set(false);
    this.error.set(null);
  }

  async loginWithEmail(email: string, password: string): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        user?: DogAuthUser;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(this.apiErrorMessage(res.status, data.error, 'Anmeldung fehlgeschlagen'));
      }
      if (!data.token || !data.user) {
        throw new Error('Ungültige Server-Antwort');
      }
      sessionStorage.setItem(SESSION_KEY, data.token);
      this.user.set(data.user);
      this.closeSheet();
      return true;
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Anmeldung fehlgeschlagen');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async registerWithEmail(email: string, password: string, name: string): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        user?: DogAuthUser;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(this.apiErrorMessage(res.status, data.error, 'Registrierung fehlgeschlagen'));
      }
      if (!data.token || !data.user) {
        throw new Error('Ungültige Server-Antwort');
      }
      sessionStorage.setItem(SESSION_KEY, data.token);
      this.user.set(data.user);
      this.closeSheet();
      return true;
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Registrierung fehlgeschlagen');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async login(provider: DogAuthProvider): Promise<void> {
    if (provider === 'email') {
      this.openSheet('login');
    }
  }

  async logout(): Promise<void> {
    const token = this.sessionToken();
    if (token) {
      await fetch('/api/auth/session', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }
    sessionStorage.removeItem(SESSION_KEY);
    this.user.set(null);
    this.menuOpen.set(false);
    this.closeSheet();
  }

  async loadPet(): Promise<DogPetState | null> {
    const token = this.sessionToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/auth/pet', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { pet: DogPetState | null };
      return data.pet;
    } catch {
      return null;
    }
  }

  async savePet(pet: DogPetState): Promise<void> {
    const token = this.sessionToken();
    if (!token) return;
    await fetch('/api/auth/pet', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pet }),
    }).catch(() => undefined);
  }

  async refreshSession(): Promise<boolean> {
    return this.restoreSession();
  }

  private apiErrorMessage(status: number, serverError: string | undefined, fallback: string): string {
    if (status === 404) {
      return 'Anmelde-Server nicht erreichbar. Bitte „npm run start:api“ starten.';
    }
    if (serverError && serverError !== 'Nicht gefunden') return serverError;
    return fallback;
  }

  private async restoreSession(): Promise<boolean> {
    const token = this.sessionToken();
    if (!token) return false;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        sessionStorage.removeItem(SESSION_KEY);
        return false;
      }
      const data = (await res.json()) as { user: DogAuthUser };
      this.user.set(data.user);
      return true;
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    }
  }

  providerEmoji(provider: DogAuthProvider): string {
    if (provider === 'email') return '✉️';
    return '👤';
  }

  providerInitial(user: DogAuthUser): string {
    const n = user.name?.trim();
    if (n) return n.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return '?';
  }
}
