import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { WeisserSchaeferAuthService } from '../../weisser-schaefer-auth.service';

@Component({
  selector: 'pv-ws-login',
  imports: [RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['../../ws-shared.scss', './login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WsLoginComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(WeisserSchaeferAuthService);

  readonly email = signal('');
  readonly password = signal('');
  readonly error = signal('');

  constructor() {
    this.auth.reloadUsersFromStorage();
  }

  submit(): void {
    const err = this.auth.login(this.email().trim(), this.password());
    if (err) {
      this.error.set(err);
      return;
    }
    this.navigateAfterLogin();
  }

  loginDemo(role: 'admin' | 'customer'): void {
    this.error.set('');
    const err = this.auth.loginDemo(role);
    if (err) {
      this.error.set(err);
      return;
    }
    this.navigateAfterLogin(role);
  }

  private navigateAfterLogin(roleHint?: 'admin' | 'customer'): void {
    const user = this.auth.currentUser();
    const role = roleHint ?? user?.role;
    if (role === 'customer') {
      void this.router.navigateByUrl('/demo/weisser-schaefer/shop');
      return;
    }
    void this.router.navigateByUrl('/demo/weisser-schaefer/verwaltung');
  }
}
