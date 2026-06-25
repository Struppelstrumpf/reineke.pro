import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { WeisserSchaeferAuthService } from '../../weisser-schaefer-auth.service';
import { WsAddressAutocompleteComponent } from '../../components/ws-address-autocomplete.component';

@Component({
  selector: 'pv-ws-register',
  imports: [RouterLink, WsAddressAutocompleteComponent],
  templateUrl: './register.component.html',
  styleUrls: ['../../ws-shared.scss', './register.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WsRegisterComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(WeisserSchaeferAuthService);

  readonly companyName = signal('');
  readonly salutation = signal('Herr');
  readonly contactName = signal('');
  readonly address = signal('');
  readonly email = signal('');
  readonly emailConfirm = signal('');
  readonly phone = signal('');
  readonly password = signal('');
  readonly passwordConfirm = signal('');
  readonly showPassword = signal(false);
  readonly showPasswordConfirm = signal(false);
  readonly captchaA = signal(0);
  readonly captchaB = signal(0);
  readonly captchaAnswer = signal('');
  readonly addressSelected = signal(false);
  readonly error = signal('');
  readonly success = signal(false);

  constructor() {
    this.refreshCaptcha();
  }

  refreshCaptcha(): void {
    this.captchaA.set(Math.floor(Math.random() * 8) + 2);
    this.captchaB.set(Math.floor(Math.random() * 8) + 2);
    this.captchaAnswer.set('');
  }

  togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  togglePasswordConfirm(): void {
    this.showPasswordConfirm.update((value) => !value);
  }

  submit(): void {
    this.error.set('');

    const email = this.email().trim().toLowerCase();
    const emailConfirm = this.emailConfirm().trim().toLowerCase();
    const password = this.password();
    const passwordConfirm = this.passwordConfirm();

    if (email !== emailConfirm) {
      this.error.set('Die E-Mail-Adressen stimmen nicht überein.');
      return;
    }

    if (password !== passwordConfirm) {
      this.error.set('Die Passwörter stimmen nicht überein.');
      return;
    }

    if (!this.phone().trim()) {
      this.error.set('Bitte Telefonnummer angeben.');
      return;
    }

    const expectedCaptcha = this.captchaA() + this.captchaB();
    const givenCaptcha = Number(this.captchaAnswer().trim());
    if (!Number.isFinite(givenCaptcha) || givenCaptcha !== expectedCaptcha) {
      this.error.set('Sicherheitsprüfung falsch — bitte erneut versuchen.');
      this.refreshCaptcha();
      return;
    }

    const err = this.auth.register({
      companyName: this.companyName(),
      contactName: this.composedContactName(),
      address: this.address(),
      email,
      password,
      phone: this.phone(),
    });
    if (err) {
      this.error.set(err);
      this.refreshCaptcha();
      return;
    }
    this.success.set(true);
  }

  goLogin(): void {
    void this.router.navigateByUrl('/demo/weisser-schaefer/anmelden');
  }

  private composedContactName(): string {
    const contact = this.contactName().trim();
    const salutation = this.salutation().trim();
    if (!contact || !salutation) {
      return contact;
    }
    const normalized = contact.toLowerCase();
    const prefix = `${salutation.toLowerCase()} `;
    if (normalized === salutation.toLowerCase() || normalized.startsWith(prefix)) {
      return contact;
    }
    return `${salutation} ${contact}`;
  }
}
