import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import { FwBookingCalendarComponent } from '../../components/fw-booking-calendar/fw-booking-calendar.component';
import { FwSupportChatAdminComponent } from '../../components/fw-support-chat-admin.component';
import { FwStudioVisualEditorComponent } from '../../components/fw-studio-visual-editor/fw-studio-visual-editor.component';
import { FusswerkAuthService } from '../../fusswerk-auth.service';
import { FW_ADMIN_EMAIL, FW_ADMIN_PASSWORD, fwRoleLabel } from '../../fusswerk-auth.types';
import { FusswerkBookingAdminService } from '../../fusswerk-booking-admin.service';
import { FusswerkChatService } from '../../fusswerk-chat.service';
import { FusswerkContentService } from '../../fusswerk-content.service';

type StudioTab = 'bookings' | 'website' | 'chat' | 'users' | 'account';

@Component({
  selector: 'pv-fw-studio',
  imports: [
    FormsModule,
    RouterLink,
    FwSupportChatAdminComponent,
    FwStudioVisualEditorComponent,
    FwBookingCalendarComponent,
  ],
  templateUrl: './studio.component.html',
  styleUrls: ['../../fusswerk-shared.scss', './studio.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwStudioComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly auth = inject(FusswerkAuthService);
  readonly content = inject(FusswerkContentService);
  readonly bookings = inject(FusswerkBookingAdminService);
  readonly chat = inject(FusswerkChatService);

  readonly roleLabel = fwRoleLabel;
  readonly email = signal(FW_ADMIN_EMAIL);
  readonly password = signal(FW_ADMIN_PASSWORD);
  readonly loginError = signal('');
  readonly tab = signal<StudioTab>('bookings');
  readonly toast = signal('');

  readonly currentPassword = signal('');
  readonly newPassword = signal('');
  readonly newPasswordRepeat = signal('');
  readonly accountError = signal('');

  readonly newStaffEmail = signal('');
  readonly newStaffName = signal('');
  readonly newStaffPassword = signal('');
  readonly newStaffRole = signal<'admin' | 'employee'>('employee');

  readonly pendingBookings = computed(() => this.bookings.pendingCount());
  readonly waitingChats = computed(() => this.chat.waitingForStaffCount());
  readonly isMobile = signal(false);

  constructor() {
    interval(5000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.auth.isStaff() && document.visibilityState === 'visible') {
          void this.bookings.refresh({ fromSync: true });
        }
      });

    effect(() => {
      if (this.auth.isStaff()) void this.bookings.refresh();
    });

    if (typeof document !== 'undefined') {
      const onVisible = () => {
        if (document.visibilityState === 'visible' && this.auth.isStaff()) {
          void this.bookings.refresh({ fromSync: true });
          this.chat.refreshFromStorage();
        }
      };
      document.addEventListener('visibilitychange', onVisible);
      this.destroyRef.onDestroy(() => document.removeEventListener('visibilitychange', onVisible));
    }

    effect(() => {
      if (!this.isMobile() || !this.auth.isStaff()) return;
      const current = this.tab();
      if (current === 'website' || current === 'users' || current === 'account') {
        this.tab.set('bookings');
      }
    });

    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(max-width: 768px)');
      const syncMobile = () => this.isMobile.set(mq.matches);
      syncMobile();
      mq.addEventListener('change', syncMobile);
      this.destroyRef.onDestroy(() => mq.removeEventListener('change', syncMobile));
    }
  }

  async login(): Promise<void> {
    this.loginError.set('');
    const err = await this.auth.login(this.email().trim(), this.password());
    if (err) {
      this.loginError.set(err);
      return;
    }
    void this.bookings.refresh();
  }

  logout(): void {
    this.auth.logout();
  }

  setTab(next: StudioTab): void {
    this.tab.set(next);
    if (next === 'bookings' || next === 'chat') {
      void this.bookings.refresh({ fromSync: true });
      this.chat.refreshFromStorage();
    }
  }

  showToast(message: string): void {
    this.toast.set(message);
    setTimeout(() => this.toast.set(''), 2800);
  }

  async changePassword(): Promise<void> {
    this.accountError.set('');
    if (this.newPassword() !== this.newPasswordRepeat()) {
      this.accountError.set('Passwörter stimmen nicht überein.');
      return;
    }
    const err = await this.auth.changePassword(this.currentPassword(), this.newPassword());
    if (err) {
      this.accountError.set(err);
      return;
    }
    this.currentPassword.set('');
    this.newPassword.set('');
    this.newPasswordRepeat.set('');
    this.showToast('Passwort wurde geändert.');
  }

  async createStaff(): Promise<void> {
    const err = await this.auth.createStaff({
      email: this.newStaffEmail(),
      contactName: this.newStaffName(),
      password: this.newStaffPassword(),
      role: this.newStaffRole(),
    });
    if (err) {
      this.showToast(err);
      return;
    }
    this.newStaffEmail.set('');
    this.newStaffName.set('');
    this.newStaffPassword.set('');
    this.showToast('Benutzer angelegt.');
  }

  toggleUserLock(userId: string, locked: boolean): void {
    const err = this.auth.setUserLocked(userId, locked);
    if (err) this.showToast(err);
  }

  deleteUser(userId: string): void {
    const err = this.auth.deleteUser(userId);
    if (err) this.showToast(err);
  }
}
