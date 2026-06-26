import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DogAuthService } from '../../dog-auth.service';

const SESSION_KEY = 'nasebaer-session-token';

@Component({
  selector: 'pv-dog-auth-callback',
  imports: [RouterLink],
  template: `
    <div class="dog-auth-callback">
      @if (error()) {
        <p class="dog-auth-callback__err" role="alert">{{ error() }}</p>
        <a routerLink="/demo/nasebaer" class="dog-auth-callback__link">Zurück zur Karte</a>
      } @else {
        <p class="dog-auth-callback__wait">Anmeldung wird abgeschlossen …</p>
      }
    </div>
  `,
  styles: `
    .dog-auth-callback {
      display: grid;
      place-content: center;
      min-height: 12rem;
      padding: 2rem;
      text-align: center;
      gap: 0.75rem;
    }
    .dog-auth-callback__wait,
    .dog-auth-callback__err {
      margin: 0;
      font-size: 0.9rem;
    }
    .dog-auth-callback__err {
      color: #ef4444;
    }
    .dog-auth-callback__link {
      color: var(--dog-accent, #6366f1);
      font-weight: 600;
      text-decoration: none;
    }
    .dog-auth-callback__link:hover {
      text-decoration: underline;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogAuthCallbackComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(DogAuthService);

  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    void this.handleCallback();
  }

  private async handleCallback(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const errorParam = params.get('error');
    const returnTo = params.get('returnTo') || '/demo/nasebaer';

    if (errorParam) {
      this.error.set(decodeURIComponent(errorParam));
      return;
    }

    if (!token) {
      this.error.set('Kein Anmelde-Token erhalten');
      return;
    }

    sessionStorage.setItem(SESSION_KEY, token);
    const ok = await this.auth.refreshSession();
    if (!ok) {
      this.error.set('Sitzung konnte nicht wiederhergestellt werden');
      return;
    }

    await this.router.navigateByUrl(returnTo);
  }
}
