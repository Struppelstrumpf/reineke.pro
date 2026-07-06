import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { FwOpeningHoursSchedule } from '../../fusswerk-content.types';
import {
  FW_TIME_OPTIONS,
  FW_WEEKDAY_LABELS,
  cloneOpeningHours,
  formatOpeningHoursButtonLabel,
  normalizeOpeningHours,
} from '../../fusswerk-opening-hours.util';

@Component({
  selector: 'pv-fw-hours-picker',
  imports: [FormsModule],
  template: `
    <button type="button" class="fw-hrs-btn" (click)="openEditor()">
      <span class="fw-hrs-btn__label">{{ formatOpeningHoursButtonLabel(schedule()) }}</span>
      <span class="fw-hrs-btn__hint">Bearbeiten</span>
    </button>

    @if (open()) {
      <div
        class="fw-hrs-pop"
        role="dialog"
        aria-modal="true"
        aria-label="Öffnungszeiten festlegen"
        (click)="open.set(false)"
      >
        <div class="fw-hrs-pop__card" (click)="$event.stopPropagation()">
          <header class="fw-hrs-pop__head">
            <div>
              <h3>Öffnungszeiten</h3>
              <p class="fw-hrs-pop__sub">Pro Tag ein oder mehrere Zeitfenster — z.&nbsp;B. für Mittagspausen.</p>
            </div>
            <button type="button" class="fw-hrs-pop__close" (click)="open.set(false)" aria-label="Schließen">×</button>
          </header>

          <div class="fw-hrs-pop__days">
            @for (day of draft(); track day.weekday) {
              <section class="fw-hrs-day" [class.is-closed]="day.closed">
                <div class="fw-hrs-day__head">
                  <strong>{{ weekdayLabel(day.weekday) }}</strong>
                  <label class="fw-hrs-day__closed">
                    <input
                      type="checkbox"
                      [ngModel]="day.closed"
                      (ngModelChange)="setClosed(day.weekday, $event)"
                      [name]="'closed' + day.weekday"
                    />
                    Geschlossen
                  </label>
                </div>

                @if (!day.closed) {
                  @for (range of day.ranges; track $index; let ri = $index) {
                    <div class="fw-hrs-range">
                      <span class="fw-hrs-range__label">Zeitfenster {{ ri + 1 }}</span>
                      <div class="fw-hrs-range__times">
                        <select
                          [ngModel]="range.from"
                          (ngModelChange)="updateRange(day.weekday, ri, 'from', $event)"
                          [name]="'from' + day.weekday + ri"
                        >
                          @for (t of timeOptions; track t) {
                            <option [value]="t">{{ t }}</option>
                          }
                        </select>
                        <span>bis</span>
                        <select
                          [ngModel]="range.to"
                          (ngModelChange)="updateRange(day.weekday, ri, 'to', $event)"
                          [name]="'to' + day.weekday + ri"
                        >
                          @for (t of timeOptions; track t) {
                            <option [value]="t">{{ t }}</option>
                          }
                        </select>
                      </div>
                      @if (day.ranges.length > 1) {
                        <button
                          type="button"
                          class="fw-hrs-range__remove"
                          (click)="removeRange(day.weekday, ri)"
                          aria-label="Zeitfenster entfernen"
                        >
                          ×
                        </button>
                      }
                    </div>
                  }
                  <button type="button" class="fw-hrs-add" (click)="addRange(day.weekday)">+ Zeitfenster</button>
                }
              </section>
            }
          </div>

          <footer class="fw-hrs-pop__foot">
            <button type="button" class="fw-hrs-pop__cancel" (click)="open.set(false)">Abbrechen</button>
            <button type="button" class="fw-hrs-pop__save" (click)="save()">Übernehmen</button>
          </footer>
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .fw-hrs-btn {
      width: 100%;
      min-height: 2.75rem;
      padding: 0.55rem 0.75rem;
      border: 1px solid var(--fw-border);
      border-radius: 0.75rem;
      background: #fff;
      font: inherit;
      text-align: left;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      transition:
        border-color 160ms ease,
        box-shadow 160ms ease;
    }

    .fw-hrs-btn:hover {
      border-color: color-mix(in srgb, var(--fw-blue) 35%, var(--fw-border));
      box-shadow: 0 0 0 3px rgba(106, 143, 168, 0.12);
    }

    .fw-hrs-btn__label {
      font-size: 0.84rem;
      font-weight: 600;
      color: var(--fw-ink);
      line-height: 1.35;
    }

    .fw-hrs-btn__hint {
      flex-shrink: 0;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--fw-blue-deep);
    }

    .fw-hrs-pop {
      position: fixed;
      inset: 0;
      z-index: 120;
      display: grid;
      place-items: center;
      padding: 1rem;
      background: rgba(20, 24, 26, 0.45);
    }

    .fw-hrs-pop__card {
      width: min(28rem, 100%);
      max-height: min(88dvh, 36rem);
      display: flex;
      flex-direction: column;
      padding: 0.9rem;
      border-radius: calc(var(--fw-radius-sm) + 2px);
      border: 1px solid var(--fw-border);
      background: var(--fw-paper);
      box-shadow: var(--fw-shadow);
    }

    .fw-hrs-pop__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.65rem;
    }

    .fw-hrs-pop__head h3 {
      margin: 0;
      font-family: var(--fw-serif);
      font-size: 1.15rem;
    }

    .fw-hrs-pop__sub {
      margin: 0.2rem 0 0;
      font-size: 0.76rem;
      color: var(--fw-muted);
      line-height: 1.4;
    }

    .fw-hrs-pop__close {
      border: 0;
      background: transparent;
      font-size: 1.4rem;
      line-height: 1;
      color: var(--fw-muted);
      cursor: pointer;
    }

    .fw-hrs-pop__days {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      padding-right: 0.15rem;
    }

    .fw-hrs-day {
      padding: 0.55rem 0.6rem;
      border: 1px solid var(--fw-border);
      border-radius: 0.7rem;
      background: #fff;
    }

    .fw-hrs-day.is-closed {
      opacity: 0.72;
    }

    .fw-hrs-day__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.35rem;
    }

    .fw-hrs-day__head strong {
      font-size: 0.88rem;
    }

    .fw-hrs-day__closed {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.76rem;
      color: var(--fw-muted);
      cursor: pointer;
    }

    .fw-hrs-range {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.35rem 0.5rem;
      align-items: center;
      margin-top: 0.35rem;
    }

    .fw-hrs-range__label {
      grid-column: 1 / -1;
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--fw-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .fw-hrs-range__times {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .fw-hrs-range__times select {
      min-width: 5.5rem;
      padding: 0.35rem 0.45rem;
      border: 1px solid var(--fw-border);
      border-radius: 0.55rem;
      font: inherit;
      font-size: 0.82rem;
      background: #fff;
    }

    .fw-hrs-range__times span {
      font-size: 0.78rem;
      color: var(--fw-muted);
    }

    .fw-hrs-range__remove {
      border: 0;
      background: transparent;
      font-size: 1.2rem;
      line-height: 1;
      color: var(--fw-muted);
      cursor: pointer;
      padding: 0.2rem;
    }

    .fw-hrs-add {
      margin-top: 0.4rem;
      border: 1px dashed color-mix(in srgb, var(--fw-blue) 35%, var(--fw-border));
      border-radius: 0.55rem;
      padding: 0.35rem 0.55rem;
      background: rgba(106, 143, 168, 0.06);
      font: inherit;
      font-size: 0.76rem;
      font-weight: 600;
      color: var(--fw-blue-deep);
      cursor: pointer;
    }

    .fw-hrs-pop__foot {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.75rem;
      padding-top: 0.65rem;
      border-top: 1px solid var(--fw-border);
    }

    .fw-hrs-pop__cancel,
    .fw-hrs-pop__save {
      border-radius: 0.65rem;
      padding: 0.45rem 0.85rem;
      font: inherit;
      font-size: 0.84rem;
      font-weight: 600;
      cursor: pointer;
    }

    .fw-hrs-pop__cancel {
      border: 1px solid var(--fw-border);
      background: #fff;
      color: var(--fw-muted);
    }

    .fw-hrs-pop__save {
      border: 0;
      background: var(--fw-blue-deep);
      color: #fff;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwHoursPickerComponent {
  readonly schedule = input.required<FwOpeningHoursSchedule>();
  readonly scheduleChange = output<FwOpeningHoursSchedule>();

  readonly open = signal(false);
  readonly draft = signal<FwOpeningHoursSchedule>([]);
  readonly timeOptions = FW_TIME_OPTIONS;
  readonly formatOpeningHoursButtonLabel = formatOpeningHoursButtonLabel;

  openEditor(): void {
    this.draft.set(cloneOpeningHours(this.schedule()));
    this.open.set(true);
  }

  weekdayLabel(weekday: number): string {
    return FW_WEEKDAY_LABELS[weekday] ?? '';
  }

  setClosed(weekday: number, closed: boolean): void {
    this.draft.update((days) =>
      days.map((d) =>
        d.weekday === weekday
          ? {
              ...d,
              closed,
              ranges: closed ? [] : d.ranges.length ? d.ranges : [{ from: '09:00', to: '18:00' }],
            }
          : d,
      ),
    );
  }

  updateRange(weekday: number, rangeIndex: number, field: 'from' | 'to', value: string): void {
    this.draft.update((days) =>
      days.map((d) => {
        if (d.weekday !== weekday) return d;
        const ranges = d.ranges.map((r, i) => (i === rangeIndex ? { ...r, [field]: value } : r));
        return { ...d, ranges };
      }),
    );
  }

  addRange(weekday: number): void {
    this.draft.update((days) =>
      days.map((d) => {
        if (d.weekday !== weekday || d.closed) return d;
        const last = d.ranges[d.ranges.length - 1];
        const nextFrom = last ? this.laterTime(last.to, '15:00') : '09:00';
        const nextTo = this.laterTime(nextFrom, '18:00');
        return { ...d, ranges: [...d.ranges, { from: nextFrom, to: nextTo }] };
      }),
    );
  }

  removeRange(weekday: number, rangeIndex: number): void {
    this.draft.update((days) =>
      days.map((d) => {
        if (d.weekday !== weekday) return d;
        const ranges = d.ranges.filter((_, i) => i !== rangeIndex);
        return { ...d, ranges: ranges.length ? ranges : [{ from: '09:00', to: '18:00' }] };
      }),
    );
  }

  save(): void {
    this.scheduleChange.emit(normalizeOpeningHours(this.draft()));
    this.open.set(false);
  }

  private laterTime(base: string, fallback: string): string {
    const idx = FW_TIME_OPTIONS.indexOf(base);
    if (idx < 0) return fallback;
    return FW_TIME_OPTIONS[Math.min(idx + 4, FW_TIME_OPTIONS.length - 1)] ?? fallback;
  }
}
