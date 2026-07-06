import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { FwHourRow } from '../../fusswerk-content.types';

@Component({
  selector: 'pv-fw-hours-list',
  template: `
    <ul class="fw-hrs-list" [class.fw-hrs-list--card]="variant() === 'card'">
      @for (row of rows(); track row.days) {
        <li class="fw-hrs-list__row" [class.is-closed]="row.closed">
          <span class="fw-hrs-list__days">{{ row.days }}</span>
          <ul class="fw-hrs-list__slots" [attr.aria-label]="'Zeiten ' + row.days">
            @if (row.closed) {
              <li class="fw-hrs-list__slot is-closed">geschlossen</li>
            } @else {
              @for (range of row.ranges; track range.from + '-' + range.to) {
                <li class="fw-hrs-list__slot">{{ range.from }} – {{ range.to }} Uhr</li>
              }
            }
          </ul>
        </li>
      }
    </ul>
  `,
  styles: `
    .fw-hrs-list {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .fw-hrs-list__row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.35rem 0.85rem;
      align-items: start;
      padding: 0.48rem 0;
      border-bottom: 1px solid var(--fw-border);
    }

    .fw-hrs-list__row:last-child {
      border-bottom: 0;
    }

    .fw-hrs-list__days {
      font-size: 0.84rem;
      line-height: 1.45;
      color: var(--fw-muted);
      padding-top: 0.08rem;
    }

    .fw-hrs-list__slots {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.14rem;
    }

    .fw-hrs-list__slot {
      font-size: 0.82rem;
      font-weight: 600;
      line-height: 1.35;
      color: var(--fw-ink);
      white-space: nowrap;
      text-align: right;
    }

    .fw-hrs-list__slot.is-closed {
      font-weight: 700;
      color: color-mix(in srgb, var(--fw-muted) 88%, var(--fw-ink));
    }

    .fw-hrs-list--card {
      border-top: 1px solid var(--fw-border);
      margin-top: 0.55rem;
      padding-top: 0.15rem;
    }

    .fw-hrs-list--card .fw-hrs-list__days {
      font-size: 0.82rem;
    }

    .fw-hrs-list--card .fw-hrs-list__slot {
      font-size: 0.8rem;
    }

    @media (max-width: 380px) {
      .fw-hrs-list__row {
        grid-template-columns: 1fr;
        gap: 0.2rem;
      }

      .fw-hrs-list__slots {
        align-items: flex-start;
      }

      .fw-hrs-list__slot {
        text-align: left;
        white-space: normal;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwHoursListComponent {
  readonly rows = input.required<FwHourRow[]>();
  readonly variant = input<'card' | 'plain'>('plain');
}
