import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import {
  FW_DURATION_OPTIONS,
  formatDurationLabel,
} from '../../fusswerk-duration.util';

@Component({
  selector: 'pv-fw-duration-picker',
  template: `
    <button type="button" class="fw-dur-btn" (click)="open.set(true)">
      {{ formatDurationLabel(minutes()) }}
    </button>

    @if (open()) {
      <div class="fw-dur-pop" role="dialog" aria-modal="true" aria-label="Dauer wählen" (click)="open.set(false)">
        <div class="fw-dur-pop__card" (click)="$event.stopPropagation()">
          <header class="fw-dur-pop__head">
            <h3>Behandlungsdauer</h3>
            <button type="button" class="fw-dur-pop__close" (click)="open.set(false)" aria-label="Schließen">×</button>
          </header>
          <p class="fw-dur-pop__hint">5 Minuten bis 3 Stunden</p>
          <div class="fw-dur-pop__grid">
            @for (option of options; track option) {
              <button
                type="button"
                class="fw-dur-pop__opt"
                [class.is-active]="minutes() === option"
                (click)="pick(option)"
              >
                {{ formatDurationLabel(option) }}
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .fw-dur-btn {
      width: 100%;
      min-height: 2.35rem;
      padding: 0.45rem 0.7rem;
      border: 1px solid var(--fw-border);
      border-radius: 0.75rem;
      background: #fff;
      font: inherit;
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--fw-ink);
      text-align: left;
      cursor: pointer;
      transition:
        border-color 160ms ease,
        box-shadow 160ms ease;
    }

    .fw-dur-btn:hover {
      border-color: color-mix(in srgb, var(--fw-blue) 35%, var(--fw-border));
      box-shadow: 0 0 0 3px rgba(106, 143, 168, 0.12);
    }

    .fw-dur-pop {
      position: fixed;
      inset: 0;
      z-index: 120;
      display: grid;
      place-items: center;
      padding: 1rem;
      background: rgba(20, 24, 26, 0.45);
    }

    .fw-dur-pop__card {
      width: min(22rem, 100%);
      max-height: min(80dvh, 28rem);
      display: flex;
      flex-direction: column;
      padding: 0.85rem;
      border-radius: calc(var(--fw-radius-sm) + 2px);
      border: 1px solid var(--fw-border);
      background: var(--fw-paper);
      box-shadow: var(--fw-shadow);
    }

    .fw-dur-pop__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.35rem;
    }

    .fw-dur-pop__head h3 {
      margin: 0;
      font-family: var(--fw-serif);
      font-size: 1.1rem;
    }

    .fw-dur-pop__close {
      border: 0;
      background: transparent;
      font-size: 1.4rem;
      line-height: 1;
      color: var(--fw-muted);
      cursor: pointer;
    }

    .fw-dur-pop__hint {
      margin: 0 0 0.65rem;
      font-size: 0.78rem;
      color: var(--fw-muted);
    }

    .fw-dur-pop__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.4rem;
      overflow-y: auto;
      padding-right: 0.1rem;
    }

    .fw-dur-pop__opt {
      border: 1px solid var(--fw-border);
      border-radius: 0.65rem;
      padding: 0.45rem 0.5rem;
      background: #fff;
      font: inherit;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--fw-muted);
      cursor: pointer;
      text-align: center;
    }

    .fw-dur-pop__opt.is-active,
    .fw-dur-pop__opt:hover {
      border-color: color-mix(in srgb, var(--fw-blue) 40%, var(--fw-border));
      color: var(--fw-blue-deep);
      background: rgba(106, 143, 168, 0.08);
    }

    @media (max-width: 380px) {
      .fw-dur-pop__grid {
        grid-template-columns: 1fr;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwDurationPickerComponent {
  readonly minutes = input.required<number>();
  readonly minutesChange = output<number>();

  readonly open = signal(false);
  readonly options = FW_DURATION_OPTIONS;
  readonly formatDurationLabel = formatDurationLabel;

  pick(value: number): void {
    this.minutesChange.emit(value);
    this.open.set(false);
  }
}
