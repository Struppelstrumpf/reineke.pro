import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { FwLogoComponent } from '../../components/fw-logo.component';
import { FW_BUSINESS } from '../../fusswerk.data';

@Component({
  selector: 'pv-fw-confirm',
  imports: [RouterLink, FwLogoComponent],
  styleUrls: ['../../fusswerk-shared.scss'],
  template: `
    <section class="fw-confirm">
      <pv-fw-logo />
      @if (ok()) {
        <h1>Termin bestätigt</h1>
        <p>Der Kunde wurde per E-Mail informiert. Der Termin ist im System als bestätigt gespeichert.</p>
      } @else if (error()) {
        <h1>Link ungültig</h1>
        <p>Dieser Bestätigungslink ist abgelaufen oder wurde bereits verwendet.</p>
      } @else {
        <h1>Bestätigung läuft …</h1>
        <p>Bitte einen Moment — Sie werden gleich weitergeleitet.</p>
      }
      <a routerLink="/demo/fusswerk" class="fw-btn fw-btn--primary">Zur Startseite</a>
    </section>
  `,
  styles: `
    .fw-confirm {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      max-width: 32rem;
      margin: 4rem auto;
      padding: 2rem 1.25rem;
      text-align: center;
    }

    @media (max-width: 600px) {
      .fw-confirm {
        margin: 2rem auto;
        padding: 1.5rem 1rem max(2rem, env(safe-area-inset-bottom));
      }

      h1 {
        font-size: 1.65rem;
      }

      .fw-btn {
        width: 100%;
        max-width: 18rem;
      }
    }

    h1 {
      margin: 0;
      font-family: var(--fw-serif);
      font-size: 2rem;
    }

    p {
      margin: 0;
      line-height: 1.65;
      color: var(--fw-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwConfirmComponent {
  private readonly route = inject(ActivatedRoute);
  readonly biz = FW_BUSINESS;

  readonly ok = toSignal(this.route.queryParamMap.pipe(map((p) => p.has('ok'))), {
    initialValue: false,
  });
  readonly error = toSignal(this.route.queryParamMap.pipe(map((p) => p.has('fehler'))), {
    initialValue: false,
  });

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token && !this.route.snapshot.queryParamMap.has('ok') && !this.route.snapshot.queryParamMap.has('fehler')) {
      window.location.href = `/api/fusswerk/confirm?token=${encodeURIComponent(token)}`;
    }
  }
}
