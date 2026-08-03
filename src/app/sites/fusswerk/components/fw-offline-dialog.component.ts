import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FusswerkConnectivityService } from '../fusswerk-connectivity.service';
import { FusswerkContentService } from '../fusswerk-content.service';

@Component({
  selector: 'pv-fw-offline-dialog',
  template: `
    @if (connectivity.visible()) {
      <div
        class="fw-offline"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fw-offline-title"
        (click)="connectivity.dismiss()"
      >
        <div class="fw-offline__panel" (click)="$event.stopPropagation()">
          <div class="fw-offline__icon" aria-hidden="true">{{ icon() }}</div>
          <h2 id="fw-offline-title" class="fw-offline__title">{{ title() }}</h2>
          <p class="fw-offline__text">{{ message() }}</p>
          <div class="fw-offline__actions">
            <button type="button" class="fw-btn fw-btn--gold" (click)="retry()">Erneut versuchen</button>
            <a class="fw-btn fw-btn--soft" [href]="biz().phoneTel">Anrufen</a>
            <button type="button" class="fw-offline__dismiss" (click)="connectivity.dismiss()">
              Schließen
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .fw-offline {
        position: fixed;
        inset: 0;
        z-index: 12000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.25rem;
        background: rgba(12, 14, 16, 0.62);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
      }

      .fw-offline__panel {
        width: min(24rem, 100%);
        padding: 1.5rem 1.35rem 1.25rem;
        border-radius: 1.1rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: linear-gradient(165deg, #2a2f34 0%, #1a1d21 100%);
        box-shadow: 0 28px 80px rgba(0, 0, 0, 0.45);
        color: #f4f0ea;
        text-align: center;
      }

      .fw-offline__icon {
        font-size: 2rem;
        line-height: 1;
        margin-bottom: 0.65rem;
      }

      .fw-offline__title {
        margin: 0 0 0.55rem;
        font-family: 'Cormorant Garamond', Georgia, serif;
        font-size: 1.65rem;
        font-weight: 600;
      }

      .fw-offline__text {
        margin: 0 0 1.15rem;
        font-size: 0.92rem;
        line-height: 1.55;
        color: rgba(255, 255, 255, 0.72);
      }

      .fw-offline__actions {
        display: flex;
        flex-direction: column;
        gap: 0.55rem;
      }

      .fw-offline__dismiss {
        margin-top: 0.15rem;
        border: 0;
        background: transparent;
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.82rem;
        cursor: pointer;
        padding: 0.35rem;
      }

      .fw-offline__dismiss:hover {
        color: rgba(255, 255, 255, 0.82);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwOfflineDialogComponent {
  readonly connectivity = inject(FusswerkConnectivityService);
  private readonly content = inject(FusswerkContentService);

  readonly biz = this.content.businessView;

  readonly title = computed(() =>
    this.connectivity.reason() === 'offline'
      ? 'Keine Internetverbindung'
      : 'Verbindung nicht möglich',
  );

  readonly message = computed(() =>
    this.connectivity.reason() === 'offline'
      ? 'Bitte prüfen Sie WLAN oder mobile Daten. Sobald Sie wieder online sind, können Sie Termine anfragen und die Seite normal nutzen.'
      : 'Unser Buchungsserver ist gerade nicht erreichbar. Bitte versuchen Sie es in Kürze erneut — oder rufen Sie uns direkt an.',
  );

  readonly icon = computed(() => (this.connectivity.reason() === 'offline' ? '📡' : '⚠️'));

  retry(): void {
    void this.connectivity.checkForHomepage();
  }
}
