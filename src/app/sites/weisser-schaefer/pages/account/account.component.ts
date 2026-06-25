import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { wsOrderCustomerStatusLabel } from '../../weisser-schaefer.data';
import { wsRoleLabel } from '../../weisser-schaefer-auth.types';
import { WeisserSchaeferAuthService } from '../../weisser-schaefer-auth.service';
import { WeisserSchaeferSessionService } from '../../weisser-schaefer-session.service';
import type { WsOrder } from '../../weisser-schaefer.data';
import { WsAddressAutocompleteComponent } from '../../components/ws-address-autocomplete.component';

@Component({
  selector: 'pv-ws-account',
  imports: [DatePipe, RouterLink, WsAddressAutocompleteComponent],
  templateUrl: './account.component.html',
  styleUrls: ['../../ws-shared.scss', './account.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WsAccountComponent {
  private readonly router = inject(Router);
  readonly auth = inject(WeisserSchaeferAuthService);
  readonly session = inject(WeisserSchaeferSessionService);

  readonly roleLabel = wsRoleLabel;
  readonly myOrders = this.session.myOrders;

  readonly profileContactName = signal('');
  readonly profileAddress = signal('');
  readonly profileAddressSelected = signal(false);
  readonly profilePhone = signal('');
  readonly profileMsg = signal('');
  readonly profileErr = signal('');

  readonly currentPassword = signal('');
  readonly newPassword = signal('');
  readonly passwordMsg = signal('');
  readonly passwordErr = signal('');

  readonly newEmail = signal('');
  readonly emailPassword = signal('');
  readonly emailMsg = signal('');
  readonly emailErr = signal('');

  constructor() {
    if (!this.auth.isLoggedIn()) {
      void this.router.navigateByUrl('/demo/weisser-schaefer/anmelden');
      return;
    }
    const user = this.auth.currentUser();
    this.newEmail.set(user?.email ?? '');
    this.profileContactName.set(user?.contactName ?? '');
    this.profileAddress.set(user?.address ?? '');
    this.profileAddressSelected.set(Boolean(user?.address?.trim()));
    this.profilePhone.set(user?.phone ?? '');
  }

  orderStatusLabel(order: WsOrder): string {
    return wsOrderCustomerStatusLabel(order);
  }

  saveProfile(): void {
    const err = this.auth.updateProfile({
      contactName: this.profileContactName(),
      address: this.profileAddress(),
      phone: this.profilePhone(),
    });
    if (err) {
      this.profileErr.set(err);
      this.profileMsg.set('');
      return;
    }
    this.profileErr.set('');
    this.profileMsg.set('Profil gespeichert.');
  }

  changePassword(): void {
    const err = this.auth.changePassword(this.currentPassword(), this.newPassword());
    if (err) {
      this.passwordErr.set(err);
      this.passwordMsg.set('');
      return;
    }
    this.passwordErr.set('');
    this.passwordMsg.set('Passwort wurde geändert.');
    this.currentPassword.set('');
    this.newPassword.set('');
  }

  changeEmail(): void {
    const err = this.auth.changeEmail(this.newEmail(), this.emailPassword());
    if (err) {
      this.emailErr.set(err);
      this.emailMsg.set('');
      return;
    }
    this.emailErr.set('');
    this.emailMsg.set('E-Mail wurde aktualisiert.');
    this.emailPassword.set('');
  }

  logout(): void {
    this.session.logout();
    void this.router.navigateByUrl('/demo/weisser-schaefer');
  }
}
