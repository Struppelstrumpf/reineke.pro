import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WeisserSchaeferAuthService } from '../../weisser-schaefer-auth.service';

@Component({
  selector: 'pv-ws-forgot-password',
  imports: [RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['../../ws-shared.scss', './forgot-password.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WsForgotPasswordComponent {
  private readonly auth = inject(WeisserSchaeferAuthService);

  readonly email = signal('');
  readonly error = signal('');
  readonly demoToken = signal('');
  readonly submitted = signal(false);

  constructor() {
    this.auth.reloadUsersFromStorage();
  }

  submit(): void {
    const result = this.auth.requestPasswordReset(this.email());
    if (result.error) {
      this.error.set(result.error);
      this.demoToken.set('');
      this.submitted.set(false);
      return;
    }
    this.error.set('');
    this.demoToken.set(result.demoToken ?? '');
    this.submitted.set(true);
  }
}
