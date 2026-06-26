import {
  ChangeDetectionStrategy,
  Component,
  effect,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { validateLoginForm, validateRegisterForm } from '../dog-auth-validation';
import { DogAuthService } from '../dog-auth.service';
import { DogMobileService } from '../dog-mobile.service';

@Component({
  selector: 'pv-dog-auth-sheet',
  imports: [FormsModule],
  templateUrl: './dog-auth-sheet.component.html',
  styleUrl: './dog-auth-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogAuthSheetComponent {
  readonly auth = inject(DogAuthService);
  readonly mobile = inject(DogMobileService);

  readonly email = signal('');
  readonly emailConfirm = signal('');
  readonly password = signal('');
  readonly passwordConfirm = signal('');
  readonly name = signal('');
  readonly showPassword = signal(false);
  readonly showPasswordConfirm = signal(false);

  constructor() {
    effect((onCleanup) => {
      document.body.style.overflow = this.auth.sheetOpen() ? 'hidden' : '';
      onCleanup(() => {
        document.body.style.overflow = '';
      });
    });
  }

  switchMode(mode: 'login' | 'register'): void {
    this.auth.sheetMode.set(mode);
    this.auth.error.set(null);
    this.emailConfirm.set('');
    this.passwordConfirm.set('');
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  togglePasswordConfirm(): void {
    this.showPasswordConfirm.update((v) => !v);
  }

  async submitEmail(): Promise<void> {
    const mail = this.email().trim();
    const pass = this.password();

    if (this.auth.sheetMode() === 'register') {
      const err = validateRegisterForm(mail, this.emailConfirm(), pass, this.passwordConfirm());
      if (err) {
        this.auth.error.set(err);
        return;
      }
      await this.auth.registerWithEmail(mail, pass, this.name());
      return;
    }

    const err = validateLoginForm(mail, pass);
    if (err) {
      this.auth.error.set(err);
      return;
    }
    await this.auth.loginWithEmail(mail, pass);
  }

  closeSheet(): void {
    this.auth.closeSheet();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.auth.sheetOpen()) {
      this.auth.closeSheet();
    }
  }
}
