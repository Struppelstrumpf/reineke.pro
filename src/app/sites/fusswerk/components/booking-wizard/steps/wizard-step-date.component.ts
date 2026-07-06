import { ChangeDetectionStrategy, Component, computed, inject, OnInit, output } from '@angular/core';
import { FwBookingWizardState } from '../fw-booking-wizard.state';

type DayOption = {
  value: string;
  weekday: string;
  day: string;
  month: string;
};

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const;
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'] as const;

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@Component({
  selector: 'pv-fw-wizard-date',
  template: `
    <div class="fw-wiz-step fw-wiz-step--date">
      <h2 class="fw-wiz-step__title">Welcher Tag passt?</h2>
      <p class="fw-wiz-step__lead">Wählen Sie ein Datum — die freien Uhrzeiten sehen Sie im nächsten Schritt.</p>

      <div class="fw-wiz-date">
        <span class="fw-wiz-field__label">Datum</span>
        <p class="fw-wiz-date__selected">{{ selectedLabel() }}</p>

        <div class="fw-wiz-date__grid" role="listbox" aria-label="Tag wählen">
          @for (day of dayOptions(); track day.value) {
            <button
              type="button"
              role="option"
              class="fw-wiz-date__day"
              [class.is-active]="state.date() === day.value"
              [attr.aria-selected]="state.date() === day.value"
              (click)="onDate(day.value)"
            >
              <span class="fw-wiz-date__weekday">{{ day.weekday }}</span>
              <span class="fw-wiz-date__num">{{ day.day }}</span>
              <span class="fw-wiz-date__month">{{ day.month }}</span>
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: '../wizard-steps.shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwWizardStepDateComponent implements OnInit {
  readonly state = inject(FwBookingWizardState);
  readonly valid = output<boolean>();

  readonly dayOptions = computed(() => this.buildDayOptions());
  readonly selectedLabel = computed(() => this.formatSelectedDate(this.state.date()));

  ngOnInit(): void {
    this.valid.emit(!!this.state.date());
  }

  onDate(value: string): void {
    this.state.date.set(value);
    this.state.slot.set('');
    this.valid.emit(true);
  }

  private formatSelectedDate(value: string): string {
    const d = new Date(`${value}T12:00:00`);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  private buildDayOptions(): DayOption[] {
    const options: DayOption[] = [];
    const cursor = new Date();
    cursor.setHours(12, 0, 0, 0);
    cursor.setDate(cursor.getDate() + 1);
    while (cursor.getDay() === 0) {
      cursor.setDate(cursor.getDate() + 1);
    }

    while (options.length < 21) {
      if (cursor.getDay() !== 0) {
        options.push({
          value: toDateKey(cursor),
          weekday: WEEKDAYS[cursor.getDay()],
          day: String(cursor.getDate()).padStart(2, '0'),
          month: MONTHS[cursor.getMonth()],
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return options;
  }
}
