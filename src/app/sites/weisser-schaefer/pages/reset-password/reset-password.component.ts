import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WeisserSchaeferAuthService } from '../../weisser-schaefer-auth.service';

@Component({
  selector: 'pv-ws-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['../../ws-shared.scss', './reset-password.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WsResetPasswordComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(WeisserSchaeferAuthService);

  readonly email = signal(this.route.snapshot.queryParamMap.get('email') ?? '');
  readonly token = signal(this.route.snapshot.queryParamMap.get('token') ?? '');
  readonly password = signal('');
  readonly error = signal('');
  readonly success = signal(false);

  submit(): void {
    const err = this.auth.resetPasswordWithToken(
      this.email(),
      this.token(),
      this.password(),
    );
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
