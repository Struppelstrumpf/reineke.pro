import { Injectable, computed, signal } from '@angular/core';

import {

  WS_ADMIN_EMAIL,

  WS_ADMIN_PASSWORD,

  WS_ACTIVATION_KEY,

  WS_RESET_KEY,

  WS_SESSION_KEY,

  WS_USERS_KEY,

  normalizeWsEmail,

  type WsActivationToken,

  type WsResetToken,

  type WsUser,

  type WsUserRole,

  type WsUserStatus,

} from './weisser-schaefer-auth.types';

import {
  buildCustomerActivationUrl,
  buildCustomerInviteEmail,
  saveCustomerInviteNotification,
  type WsCustomerInviteEmail,
} from './ws-customer-invite-email';



export type WsRegisterInput = {

  companyName: string;

  contactName: string;

  address: string;

  email: string;

  password: string;

  phone: string;

};



export type WsActivateCustomerInput = {
  email: string;
  token: string;
  companyName: string;
  contactName: string;
  address: string;
  phone: string;
  password: string;
};

export type WsCreateStaffInput = {
  email: string;

  contactName: string;

  role: 'admin' | 'employee';

  password: string;

  companyName?: string;

};



const WS_AUTH_CHANNEL = 'ws-demo-auth-sync';



@Injectable({ providedIn: 'root' })

export class WeisserSchaeferAuthService {

  private readonly users = signal<WsUser[]>(this.loadUsers());

  private readonly sessionUserId = signal<string | null>(this.loadSession());

  private readonly syncChannel =

    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(WS_AUTH_CHANNEL) : null;



  readonly currentUser = computed(() => {

    const id = this.sessionUserId();

    if (!id) {

      return null;

    }

    return this.users().find((u) => u.id === id) ?? null;

  });



  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  readonly isCustomer = computed(() => this.currentUser()?.role === 'customer');

  readonly isStaff = computed(() => {

    const user = this.currentUser();
    const role = user?.role;

    return (role === 'admin' || role === 'employee') && user?.locked !== true;

  });

  readonly isAdmin = computed(() => {
    const user = this.currentUser();
    return user?.role === 'admin' && user.locked !== true;
  });

  readonly canOrder = computed(() => {

    const user = this.currentUser();

    return user?.role === 'customer' && user.status === 'approved' && user.locked !== true;

  });



  readonly pendingCustomers = computed(() =>

    this.users().filter((u) => u.role === 'customer' && u.status === 'pending'),

  );

  readonly invitedCustomers = computed(() =>
    this.users().filter((u) => u.role === 'customer' && u.status === 'invited'),
  );



  readonly allUsers = computed(() => this.users());



  constructor() {

    if (typeof window === 'undefined') {

      return;

    }



    window.addEventListener('storage', (event) => {

      if (event.key === WS_USERS_KEY) {

        this.reloadUsersFromStorage();

      }

    });



    window.addEventListener('focus', () => this.reloadUsersFromStorage());



    this.syncChannel?.addEventListener('message', () => {
      this.reloadUsersFromStorage();
    });

    window.addEventListener('ws-users-updated', () => {
      this.reloadUsersFromStorage();
    });

    this.reloadUsersFromStorage();
  }



  /** Lädt Benutzer neu aus localStorage (z. B. nach Registrierung in anderem Tab). */

  reloadUsersFromStorage(): void {

    const fresh = this.readUsersFromStorage();

    if (fresh) {

      this.users.set(fresh);
      const current = this.currentUser();
      if (current?.locked) {
        this.logout();
      }

    }

  }



  login(email: string, password: string): string | null {
    const user = this.findUserByEmail(email);

    if (!user) {
      return 'E-Mail oder Passwort ist falsch.';
    }

    if (user.role === 'customer' && user.status === 'invited') {
      return 'Bitte aktivieren Sie zuerst Ihr Konto über den Link in der Einladungs-E-Mail.';
    }

    if (user.password !== password) {
      return 'E-Mail oder Passwort ist falsch.';
    }

    if (user.locked) {
      return 'Dieses Konto ist derzeit gesperrt.';
    }

    this.sessionUserId.set(user.id);

    sessionStorage.setItem(WS_SESSION_KEY, user.id);

    return null;

  }



  logout(): void {

    this.sessionUserId.set(null);

    sessionStorage.removeItem(WS_SESSION_KEY);

  }



  register(input: WsRegisterInput): string | null {

    this.reloadUsersFromStorage();

    const email = normalizeWsEmail(input.email);

    if (
      !email ||
      !input.password ||
      !input.companyName.trim() ||
      !input.contactName.trim() ||
      !input.address.trim()
    ) {

      return 'Bitte alle Pflichtfelder ausfüllen.';

    }

    const phone = input.phone.trim();
    if (!phone) {
      return 'Bitte Telefonnummer angeben.';
    }

    if (input.password.length < 4) {

      return 'Passwort muss mindestens 4 Zeichen haben.';

    }

    if (this.users().some((u) => u.email.toLowerCase() === email)) {

      return 'Diese E-Mail ist bereits registriert.';

    }

    const user: WsUser = {

      id: `u-${Date.now()}`,

      email,

      password: input.password,

      role: 'customer',

      status: 'pending',
      locked: false,

      companyName: input.companyName.trim(),

      contactName: input.contactName.trim(),

      address: input.address.trim(),

      phone,

      createdAt: new Date().toISOString(),

    };

    this.users.update((list) => [...list, user]);

    try {
      this.persistUsers();
    } catch {
      this.users.update((list) => list.filter((entry) => entry.id !== user.id));
      return 'Speichern fehlgeschlagen — bitte keinen privaten Browser-Modus verwenden.';
    }

    const stored = this.readUsersFromStorage();
    if (!stored?.some((entry) => entry.id === user.id)) {
      return 'Registrierung konnte nicht gespeichert werden. Bitte Seite neu laden und erneut versuchen.';
    }

    this.notifyUsersChanged();

    return null;

  }

  inviteCustomer(email: string): {
    error: string | null;
    demoToken?: string;
    inviteEmail?: WsCustomerInviteEmail;
  } {
    if (!this.isStaff()) {
      return { error: 'Keine Berechtigung.' };
    }

    this.reloadUsersFromStorage();
    const normalized = normalizeWsEmail(email);
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return { error: 'Bitte eine gültige E-Mail-Adresse eingeben.' };
    }

    const existing = this.findUserByEmail(normalized);
    if (existing) {
      if (existing.status === 'invited') {
        return { error: 'Für diese E-Mail liegt bereits eine Einladung vor.' };
      }
      return { error: 'Diese E-Mail ist bereits registriert.' };
    }

    const staff = this.currentUser();
    const user: WsUser = {
      id: `u-${Date.now()}`,
      email: normalized,
      password: '',
      role: 'customer',
      status: 'invited',
      locked: false,
      companyName: '',
      contactName: '',
      createdAt: new Date().toISOString(),
    };

    const token = `INV-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const activationUrl = buildCustomerActivationUrl(normalized, token);
    const inviteEmail = buildCustomerInviteEmail({
      customerEmail: normalized,
      activationUrl,
      invitedByName: staff?.contactName,
    });

    this.users.update((list) => [...list, user]);
    this.persistUsers();
    this.storeActivationToken({
      email: normalized,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      invitedBy: staff?.id,
    });
    saveCustomerInviteNotification(inviteEmail);
    this.notifyUsersChanged();

    return { error: null, demoToken: token, inviteEmail };
  }

  activateCustomerAccount(input: WsActivateCustomerInput): string | null {
    const normalized = normalizeWsEmail(input.email);
    const token = input.token.trim().toUpperCase();
    const companyName = input.companyName.trim();
    const contactName = input.contactName.trim();
    const address = input.address.trim();
    const phone = input.phone.trim();

    if (!normalized || !token || !companyName || !contactName || !address || !phone || !input.password) {
      return 'Bitte alle Pflichtfelder ausfüllen.';
    }

    if (input.password.length < 4) {
      return 'Passwort muss mindestens 4 Zeichen haben.';
    }

    const entry = this.findActivationToken(normalized, token);
    if (!entry) {
      return 'Einladungslink ungültig oder abgelaufen.';
    }

    const user = this.findUserByEmail(normalized);
    if (!user || user.role !== 'customer' || user.status !== 'invited') {
      return 'Konto nicht gefunden oder bereits aktiviert.';
    }

    this.updateUser(user.id, {
      companyName,
      contactName,
      address,
      phone,
      password: input.password,
      status: 'approved',
    });

    this.removeActivationToken(token);
    return null;
  }

  approveCustomer(userId: string): string | null {
    if (!this.isStaff()) {
      return 'Keine Berechtigung.';
    }
    this.reloadUsersFromStorage();
    const target = this.users().find((u) => u.id === userId);
    if (!target || target.role !== 'customer') {
      return 'Benutzer nicht gefunden.';
    }
    this.updateUser(userId, { status: 'approved' });
    return null;
  }



  createStaff(input: WsCreateStaffInput): string | null {

    if (!this.isAdmin()) {

      return 'Keine Berechtigung.';

    }

    this.reloadUsersFromStorage();

    const email = normalizeWsEmail(input.email);

    if (!email || !input.password || !input.contactName.trim()) {

      return 'Bitte alle Pflichtfelder ausfüllen.';

    }

    if (this.users().some((u) => u.email.toLowerCase() === email)) {

      return 'Diese E-Mail existiert bereits.';

    }

    const user: WsUser = {

      id: `u-${Date.now()}`,

      email,

      password: input.password,

      role: input.role,

      status: 'approved',
      locked: false,

      companyName: input.companyName?.trim() || 'Weißer Schäfer',

      contactName: input.contactName.trim(),

      createdAt: new Date().toISOString(),

    };

    this.users.update((list) => [...list, user]);

    this.persistUsers();

    this.notifyUsersChanged();

    return null;

  }



  setUserRole(userId: string, role: WsUserRole): string | null {

    if (!this.isAdmin()) {

      return 'Keine Berechtigung.';

    }

    const target = this.users().find((u) => u.id === userId);

    if (!target) {

      return 'Benutzer nicht gefunden.';

    }

    if (target.id === this.currentUser()?.id && role !== 'admin') {

      return 'Du kannst deine eigene Admin-Rolle nicht entfernen.';

    }

    this.updateUser(userId, { role });

    return null;

  }

  setUserLocked(userId: string, locked: boolean): string | null {
    if (!this.isAdmin()) {
      return 'Keine Berechtigung.';
    }

    const target = this.users().find((u) => u.id === userId);
    if (!target) {
      return 'Benutzer nicht gefunden.';
    }

    if (target.id === this.currentUser()?.id && locked) {
      return 'Du kannst deinen eigenen Account nicht sperren.';
    }

    if (target.role === 'admin' && locked && this.countUnlockedAdminsExcluding(target.id) === 0) {
      return 'Mindestens ein aktiver Administrator muss erhalten bleiben.';
    }

    this.updateUser(userId, { locked });
    return null;
  }

  deleteUser(userId: string): string | null {
    if (!this.isAdmin()) {
      return 'Keine Berechtigung.';
    }

    const target = this.users().find((u) => u.id === userId);
    if (!target) {
      return 'Benutzer nicht gefunden.';
    }
    if (target.id === this.currentUser()?.id) {
      return 'Du kannst deinen eigenen Account nicht löschen.';
    }
    if (target.role === 'admin' && this.countAdminsExcluding(target.id) === 0) {
      return 'Mindestens ein Administrator muss erhalten bleiben.';
    }

    this.users.update((list) => list.filter((u) => u.id !== userId));
    this.persistUsers();
    this.notifyUsersChanged();
    if (this.sessionUserId() === userId) {
      sessionStorage.removeItem(WS_SESSION_KEY);
      this.sessionUserId.set(null);
    }
    return null;
  }



  changePassword(currentPassword: string, newPassword: string): string | null {

    const user = this.currentUser();

    if (!user) {

      return 'Nicht angemeldet.';

    }

    if (user.password !== currentPassword) {

      return 'Aktuelles Passwort ist falsch.';

    }

    if (newPassword.length < 4) {

      return 'Neues Passwort muss mindestens 4 Zeichen haben.';

    }

    this.updateUser(user.id, { password: newPassword });

    return null;

  }



  updateProfile(input: { contactName: string; address: string; phone: string }): string | null {
    const user = this.currentUser();

    if (!user) {
      return 'Nicht angemeldet.';
    }

    const contactName = input.contactName.trim();
    const address = input.address.trim();
    const phone = input.phone.trim();

    if (!contactName || !address || !phone) {
      return 'Bitte Kontakt, Anschrift und Telefon ausfüllen.';
    }

    this.updateUser(user.id, { contactName, address, phone });
    return null;
  }

  changeEmail(newEmail: string, currentPassword: string): string | null {

    const user = this.currentUser();

    if (!user) {

      return 'Nicht angemeldet.';

    }

    if (user.password !== currentPassword) {

      return 'Passwort zur Bestätigung ist falsch.';

    }

    const email = newEmail.trim().toLowerCase();

    if (!email) {

      return 'Bitte eine gültige E-Mail eingeben.';

    }

    if (this.users().some((u) => u.id !== user.id && u.email.toLowerCase() === email)) {

      return 'Diese E-Mail wird bereits verwendet.';

    }

    this.updateUser(user.id, { email });

    return null;

  }



  requestPasswordReset(email: string): { error: string | null; demoToken?: string } {
    const normalized = normalizeWsEmail(email);

    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return { error: 'Bitte eine gültige E-Mail-Adresse eingeben.' };
    }

    const user = this.findUserByEmail(normalized);

    if (!user || user.role !== 'customer') {
      return { error: null };
    }

    const token = `WS-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

    const entry: WsResetToken = {
      email: normalized,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };

    const tokens = this.loadResetTokens().filter((t) => t.email !== entry.email);
    tokens.push(entry);
    localStorage.setItem(WS_RESET_KEY, JSON.stringify(tokens));

    return { error: null, demoToken: token };
  }



  resetPasswordWithToken(email: string, token: string, newPassword: string): string | null {

    const normalized = normalizeWsEmail(email);

    const tokens = this.loadResetTokens();

    const entry = tokens.find(

      (t) =>

        t.email === normalized &&

        t.token === token.trim().toUpperCase() &&

        new Date(t.expiresAt) > new Date(),

    );

    if (!entry) {

      return 'Link ungültig oder abgelaufen.';

    }

    const user = this.findUserByEmail(normalized);

    if (!user || user.role !== 'customer') {

      return 'Zurücksetzen nur für Fleischerei-Konten möglich.';

    }

    if (newPassword.length < 4) {

      return 'Passwort muss mindestens 4 Zeichen haben.';

    }

    this.updateUser(user.id, { password: newPassword });

    localStorage.setItem(

      WS_RESET_KEY,

      JSON.stringify(tokens.filter((t) => t.token !== entry.token)),

    );

    return null;

  }

  private countUnlockedAdminsExcluding(userId: string): number {
    return this.users().filter((u) => u.id !== userId && u.role === 'admin' && !u.locked).length;
  }

  private countAdminsExcluding(userId: string): number {
    return this.users().filter((u) => u.id !== userId && u.role === 'admin').length;
  }



  private updateUser(id: string, patch: Partial<WsUser>): void {

    this.users.update((list) =>

      list.map((u) => (u.id === id ? { ...u, ...patch } : u)),

    );

    this.persistUsers();

    this.notifyUsersChanged();

  }



  private notifyUsersChanged(): void {
    this.syncChannel?.postMessage({ type: 'users-updated' });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ws-users-updated'));
    }
  }



  private findUserByEmail(email: string): WsUser | undefined {
    this.reloadUsersFromStorage();
    const normalized = normalizeWsEmail(email);
    return this.users().find((user) => normalizeWsEmail(user.email) === normalized);
  }

  private normalizeUser(raw: Partial<WsUser> & { id: string; email: string }): WsUser {

    return {

      id: raw.id,

      email: normalizeWsEmail(raw.email),

      password: typeof raw.password === 'string' ? raw.password : '',

      role: raw.role ?? 'customer',

      status: (raw.status ?? 'pending') as WsUserStatus,
      locked: raw.locked === true,

      companyName: raw.companyName ?? 'Unbekannt',

      contactName: raw.contactName ?? raw.email,

      address: raw.address,

      phone: raw.phone,

      createdAt: raw.createdAt ?? new Date().toISOString(),

    };

  }



  private readUsersFromStorage(): WsUser[] | null {

    try {

      const raw = localStorage.getItem(WS_USERS_KEY);

      if (!raw) {

        return null;

      }

      const parsed = JSON.parse(raw) as unknown;

      if (!Array.isArray(parsed)) {

        return null;

      }

      const list = parsed.map((u) => this.normalizeUser(u as WsUser));

      const withAdmin = this.ensureAdminSeed(list);

      const needsMigrate = (parsed as Partial<WsUser>[]).some((raw, index) => {
        const source = String(raw.email ?? '');
        const normalized = withAdmin[index]?.email ?? '';
        return source && normalizeWsEmail(source) !== source;
      });

      if (needsMigrate) {
        this.persistUsersList(withAdmin);
      }

      return withAdmin;

    } catch {

      return null;

    }

  }



  private loadUsers(): WsUser[] {

    const stored = this.readUsersFromStorage();

    if (stored && stored.length > 0) {

      return stored;

    }



    const seed: WsUser[] = [

      {

        id: 'admin-seed',

        email: WS_ADMIN_EMAIL,

        password: WS_ADMIN_PASSWORD,

        role: 'admin',

        status: 'approved',
        locked: false,

        companyName: 'Weißer Schäfer',

        contactName: 'Thomas Weiß',
        address: 'Langer Weg 12, 33334 Gütersloh',
        phone: '+49 5242 987650',

        createdAt: '2024-01-01T00:00:00.000Z',

      },

    ];

    localStorage.setItem(WS_USERS_KEY, JSON.stringify(seed));

    return seed;

  }



  private ensureAdminSeed(list: WsUser[]): WsUser[] {

    const adminIndex = list.findIndex(

      (u) => u.email.toLowerCase() === WS_ADMIN_EMAIL.toLowerCase(),

    );

    if (adminIndex >= 0) {
      const admin = list[adminIndex];
      const needsPatch =
        admin.role !== 'admin' ||
        admin.status !== 'approved' ||
        admin.contactName !== 'Thomas Weiß' ||
        admin.address !== 'Langer Weg 12, 33334 Gütersloh' ||
        admin.phone !== '+49 5242 987650' ||
        admin.companyName !== 'Weißer Schäfer';

      if (!needsPatch) {
        return list;
      }

      const patched = [...list];
      patched[adminIndex] = {
        ...admin,
        role: 'admin',
        status: 'approved',
        locked: false,
        password: admin.password || WS_ADMIN_PASSWORD,
        companyName: 'Weißer Schäfer',
        contactName: 'Thomas Weiß',
        address: 'Langer Weg 12, 33334 Gütersloh',
        phone: '+49 5242 987650',
      };

      localStorage.setItem(WS_USERS_KEY, JSON.stringify(patched));
      return patched;
    }

    const seeded = [

      ...list,

      {

        id: 'admin-seed',

        email: WS_ADMIN_EMAIL,

        password: WS_ADMIN_PASSWORD,

        role: 'admin' as const,

        status: 'approved' as const,
        locked: false,

        companyName: 'Weißer Schäfer',

        contactName: 'Thomas Weiß',
        address: 'Langer Weg 12, 33334 Gütersloh',
        phone: '+49 5242 987650',

        createdAt: '2024-01-01T00:00:00.000Z',

      },

    ];

    localStorage.setItem(WS_USERS_KEY, JSON.stringify(seeded));

    return seeded;

  }



  private persistUsers(): void {

    this.persistUsersList(this.users());

  }

  private persistUsersList(users: WsUser[]): void {

    localStorage.setItem(WS_USERS_KEY, JSON.stringify(users));

  }



  private loadSession(): string | null {

    return sessionStorage.getItem(WS_SESSION_KEY);

  }



  private loadResetTokens(): WsResetToken[] {

    try {

      const raw = localStorage.getItem(WS_RESET_KEY);

      if (raw) {

        return JSON.parse(raw) as WsResetToken[];

      }

    } catch {

      /* ignore */

    }

    return [];

  }

  private loadActivationTokens(): WsActivationToken[] {
    try {
      const raw = localStorage.getItem(WS_ACTIVATION_KEY);
      if (raw) {
        return JSON.parse(raw) as WsActivationToken[];
      }
    } catch {
      /* ignore */
    }
    return [];
  }

  private storeActivationToken(entry: WsActivationToken): void {
    const tokens = this.loadActivationTokens().filter((item) => item.email !== entry.email);
    tokens.push(entry);
    localStorage.setItem(WS_ACTIVATION_KEY, JSON.stringify(tokens));
  }

  private findActivationToken(email: string, token: string): WsActivationToken | undefined {
    return this.loadActivationTokens().find(
      (item) =>
        item.email === email &&
        item.token === token &&
        new Date(item.expiresAt) > new Date(),
    );
  }

  private removeActivationToken(token: string): void {
    localStorage.setItem(
      WS_ACTIVATION_KEY,
      JSON.stringify(this.loadActivationTokens().filter((item) => item.token !== token)),
    );
  }

}


