import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { DogAuthService } from '../dog-auth.service';
import { DogSocialService } from '../dog-social.service';

@Component({
  selector: 'pv-dog-friends-nav',
  template: `
    @if (auth.user()) {
      <button
        type="button"
        class="dog-friends-nav"
        aria-label="Freunde und Treffen"
        (click)="openFriends()"
      >
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
          <path
            fill="currentColor"
            d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
          />
        </svg>
        <span class="dog-friends-nav__label">Freunde</span>
        @if (social.unread() > 0) {
          <span class="dog-friends-nav__badge" [attr.aria-label]="social.unread() + ' neue Benachrichtigungen'">
            {{ social.unread() > 9 ? '9+' : social.unread() }}
          </span>
        }
      </button>
    }
  `,
  styleUrl: './dog-friends-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogFriendsNavComponent {
  readonly auth = inject(DogAuthService);
  readonly social = inject(DogSocialService);

  constructor() {
    effect(() => {
      if (this.auth.user()) void this.social.refresh();
    });
  }

  openFriends(): void {
    this.social.openHub('discover');
  }
}
