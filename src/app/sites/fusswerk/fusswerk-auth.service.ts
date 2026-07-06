import { Injectable, computed, signal } from '@angular/core';
import {
  FW_ADMIN_EMAIL,
  FW_ADMIN_PASSWORD,
  FW_SESSION_KEY,
  FW_USERS_KEY,
  normalizeFwEmail,
  type FwUser,
  type FwUserRole,
} from './fusswerk-auth.types';
import { hashPassword, isHashedPassword, verifyPassword } from './fusswerk-password.util';
import { sanitizeText } from './fusswerk-security';

const FW_AUTH_CHANNEL = 'fw-demo-auth-sync';

@Injectable({ providedIn: 'root' })
export class FusswerkAuthService {
  private readonly users = signal<FwUser[]>(this.loadUsers());
  private readonly sessionUserId = signal<string | null>(this.loadSession());
  private readonly syncChannel =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(FW_AUTH_CHANNEL) : null;

  readonly currentUser = computed(() => {
    const id = this.sessionUserId();
    if (!id) return null;
    return this.users().find((u) => u.id === id) ?? null;
  });

  readonly isLoggedIn = computed(() => !!this.currentUser());
  readonly isStaff = computed(() => {
    const user = this.currentUser();
    return !!user && user.status === 'approved' && (user.role === 'admin' || user.role === 'employee');
  });
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  constructor() {
    if (typeof window === 'undefined') return;
    void this.migratePlainPasswords();
    window.addEventListener('storage', (event) => {
      if (event.key === FW_USERS_KEY) {
        this.users.set(this.loadUsers());
      }
      if (event.key === FW_SESSION_KEY) {
        this.sessionUserId.set(this.loadSession());
      }
    });
    this.syncChannel?.addEventListener('message', () => {
      this.users.set(this.loadUsers());
    });
  }

  reloadUsersFromStorage(): void {
    this.users.set(this.loadUsers());
  }

  async login(email: string, password: string): Promise<string | null> {
    const normalized = normalizeFwEmail(email);
    const user = this.users().find((u) => normalizeFwEmail(u.email) === normalized);
    if (!user) return 'E-Mail oder Passwort ist falsch.';
    if (user.status === 'locked') return 'Dieses Konto ist gesperrt.';
    const ok = await verifyPassword(password, user.password);
    if (!ok) return 'E-Mail oder Passwort ist falsch.';
    if (!isHashedPassword(user.password)) {
      await this.upgradePasswordHash(user.id, password);
    }
    this.setSession(user.id);
    return null;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<string | null> {
    const user = this.currentUser();
    if (!user) return 'Nicht angemeldet.';
    const ok = await verifyPassword(currentPassword, user.password);
    if (!ok) return 'Aktuelles Passwort ist falsch.';
    const next = sanitizeText(newPassword, 128);
    if (next.length < 6) return 'Neues Passwort: mindestens 6 Zeichen.';
    const hashed = await hashPassword(next);
    this.saveUsers(this.users().map((u) => (u.id === user.id ? { ...u, password: hashed } : u)));
    return null;
  }

  logout(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(FW_SESSION_KEY);
    }
    this.sessionUserId.set(null);
  }

  async createStaff(input: {
    email: string;
    contactName: string;
    role: FwUserRole;
    password: string;
  }): Promise<string | null> {
    if (!this.isAdmin()) return 'Keine Berechtigung.';
    const email = normalizeFwEmail(input.email);
    if (!email.includes('@')) return 'Bitte gültige E-Mail angeben.';
    if (this.users().some((u) => normalizeFwEmail(u.email) === email)) {
      return 'Diese E-Mail ist bereits vergeben.';
    }
    const pw = sanitizeText(input.password, 128);
    if (pw.length < 6) return 'Passwort: mindestens 6 Zeichen.';
    const user: FwUser = {
      id: `fw-user-${Date.now().toString(36)}`,
      email,
      password: await hashPassword(pw),
      contactName: sanitizeText(input.contactName, 80) || 'Mitarbeiter',
      role: input.role,
      status: 'approved',
      createdAt: new Date().toISOString(),
    };
    this.saveUsers([...this.users(), user]);
    return null;
  }

  setUserLocked(userId: string, locked: boolean): string | null {
    if (!this.isAdmin()) return 'Keine Berechtigung.';
    const current = this.currentUser();
    if (current?.id === userId) return 'Eigenes Konto kann nicht gesperrt werden.';
    this.saveUsers(
      this.users().map((u) =>
        u.id === userId ? { ...u, status: locked ? 'locked' : 'approved' } : u,
      ),
    );
    return null;
  }

  deleteUser(userId: string): string | null {
    if (!this.isAdmin()) return 'Keine Berechtigung.';
    const target = this.users().find((u) => u.id === userId);
    if (!target) return 'Benutzer nicht gefunden.';
    if (target.role === 'admin') return 'Administratoren können nicht gelöscht werden.';
    this.saveUsers(this.users().filter((u) => u.id !== userId));
    return null;
  }

  allUsers(): FwUser[] {
    return [...this.users()].sort((a, b) => a.contactName.localeCompare(b.contactName, 'de'));
  }

  private async upgradePasswordHash(userId: string, plain: string): Promise<void> {
    const hashed = await hashPassword(plain);
    this.saveUsers(this.users().map((u) => (u.id === userId ? { ...u, password: hashed } : u)));
  }

  private async migratePlainPasswords(): Promise<void> {
    const users = this.users();
    let changed = false;
    const next = await Promise.all(
      users.map(async (u) => {
        if (isHashedPassword(u.password)) return u;
        changed = true;
        return { ...u, password: await hashPassword(u.password) };
      }),
    );
    if (changed) this.saveUsers(next);
  }

  private setSession(userId: string): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(FW_SESSION_KEY, userId);
    }
    this.sessionUserId.set(userId);
  }

  private loadSession(): string | null {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem(FW_SESSION_KEY);
  }

  private loadUsers(): FwUser[] {
    if (typeof localStorage === 'undefined') return this.seedUsers();
    try {
      const raw = localStorage.getItem(FW_USERS_KEY);
      if (!raw) {
        const seeded = this.seedUsers();
        localStorage.setItem(FW_USERS_KEY, JSON.stringify(seeded));
        return seeded;
      }
      const parsed = JSON.parse(raw) as FwUser[];
      return Array.isArray(parsed) && parsed.length ? parsed : this.seedUsers();
    } catch {
      return this.seedUsers();
    }
  }

  private seedUsers(): FwUser[] {
    return [
      {
        id: 'fw-admin-1',
        email: FW_ADMIN_EMAIL,
        password: FW_ADMIN_PASSWORD,
        contactName: 'Studio Admin',
        role: 'admin',
        status: 'approved',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  private saveUsers(users: FwUser[]): void {
    this.users.set(users);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FW_USERS_KEY, JSON.stringify(users));
    }
    this.syncChannel?.postMessage({ type: 'users' });
  }
}
