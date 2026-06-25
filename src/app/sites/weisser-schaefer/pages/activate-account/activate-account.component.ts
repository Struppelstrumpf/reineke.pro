import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WeisserSchaeferAuthService } from '../../weisser-schaefer-auth.service';
import { WsAddressAutocompleteComponent } from '../../components/ws-address-autocomplete.component';

@Component({
  selector: 'pv-ws-activate-account',
  imports: [WsAddressAutocompleteComponent],
  templateUrl: './activate-account.component.html',
  styleUrls: ['../../ws-shared.scss', '../register/register.component.scss', './activate-account.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WsActivateAccountComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(WeisserSchaeferAuthService);

  readonly email = signal(this.route.snapshot.queryParamMap.get('email') ?? '');
  readonly token = signal(this.route.snapshot.queryParamMap.get('token') ?? '');
  readonly companyName = signal('');
  readonly contactName = signal('');
  readonly address = signal('');
  readonly phone = signal('');
  readonly password = signal('');
  readonly passwordConfirm = signal('');
  readonly addressSelected = signal(false);
  readonly showPassword = signal(false);
  readonly showPasswordConfirm = signal(false);
  readonly error = signal('');
  readonly success = signal(false);

  togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  togglePasswordConfirm(): void {
    this.showPasswordConfirm.update((value) => !value);
  }

  submit(): void {
    this.error.set('');

    if (this.password() !== this.passwordConfirm()) {
      this.error.set('Die Passwörter stimmen nicht überein.');
      return;
    }

    const err = this.auth.activateCustomerAccount({
      email: this.email(),
      token: this.token(),
      companyName: this.companyName(),
      contactName: this.contactName(),
      address: this.address(),
      phone: this.phone(),
      password: this.password(),
    });

    if (err) {
      this.error.set(err);
      return;
    }

    this.success.set(true);
  }

  goLogin(): void {
    void this.router.navigateByUrl('/demo/weisser-schaefer/anmelden');
  }
}
