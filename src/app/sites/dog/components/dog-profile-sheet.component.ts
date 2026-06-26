import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { validateAuthEmail, validateAuthPassword } from '../dog-auth-validation';
import { DogAuthService } from '../dog-auth.service';
import { DogSocialService } from '../dog-social.service';

@Component({
  selector: 'pv-dog-profile-sheet',
  imports: [FormsModule],
  templateUrl: './dog-profile-sheet.component.html',
  styleUrl: './dog-profile-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogProfileSheetComponent {
  readonly auth = inject(DogAuthService);
  readonly social = inject(DogSocialService);

  readonly tab = signal<'email' | 'password'>('email');
  readonly newEmail = signal('');
  readonly emailPassword = signal('');
  readonly currentPassword = signal('');
  readonly newPassword = signal('');
  readonly newPasswordConfirm = signal('');
  readonly showPw = signal(false);
  readonly success = signal<string | null>(null);

  switchTab(next: 'email' | 'password'): void {
    this.tab.set(next);
    this.social.error.set(null);
    this.success.set(null);
  }

  async submitEmail(): Promise<void> {
    const mail = this.newEmail().trim();
    const err = validateAuthEmail(mail);
    if (err) {
      this.social.error.set(err);
      return;
    }
    if (!this.emailPassword()) {
      this.social.error.set('Aktuelles Passwort eingeben');
      return;
    }
    const ok = await this.social.changeEmail(mail, this.emailPassword());
    if (ok) {
      this.success.set('E-Mail wurde aktualisiert');
      this.newEmail.set('');
      this.emailPassword.set('');
    }
  }

  async submitPassword(): Promise<void> {
    if (!this.currentPassword()) {
      this.social.error.set('Aktuelles Passwort eingeben');
      return;
    }
    const passErr = validateAuthPassword(this.newPassword());
    if (passErr) {
      this.social.error.set(passErr);
      return;
    }
    if (this.newPassword() !== this.newPasswordConfirm()) {
      this.social.error.set('Passwörter stimmen nicht überein');
      return;
    }
    const ok = await this.social.changePassword(this.currentPassword(), this.newPassword());
    if (ok) {
      this.success.set('Passwort wurde geändert');
      this.currentPassword.set('');
      this.newPassword.set('');
      this.newPasswordConfirm.set('');
    }
  }

  close(): void {
    this.social.closeProfile();
  }

  togglePw(): void {
    this.showPw.update((v) => !v);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.social.profileOpen()) this.close();
  }
}
