import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FusswerkContentService } from '../fusswerk-content.service';
import { getDayRangesMinutes, getLiveOpenStatus } from '../fusswerk-opening-hours.util';
import { FwHoursListComponent } from './fw-hours-list/fw-hours-list.component';

@Component({
  selector: 'pv-fw-hours-card',
  imports: [FwHoursListComponent],
  template: `
    <aside class="fw-hours-card" aria-labelledby="fw-hours-title">
      <div class="fw-hours-card__live">
        <span class="fw-hours-card__pulse" [class]="'is-' + status().tone" aria-hidden="true"></span>
        <p class="fw-hours-card__badge">{{ status().badge }}</p>
      </div>
      <h2 id="fw-hours-title" class="fw-hours-card__title">Öffnungszeiten</h2>
      <p class="fw-hours-card__detail">{{ status().detail }}</p>

      <div class="fw-hours-card__week" role="group" aria-label="Wochenübersicht">
        @for (day of week(); track day.key) {
          <span
            class="fw-hours-card__day"
            [class.is-today]="day.isToday"
            [class.is-closed]="day.isClosed"
          >
            {{ day.label }}
          </span>
        }
      </div>

      <button
        type="button"
        class="fw-hours-card__toggle"
        [attr.aria-expanded]="expanded()"
        (click)="expanded.set(!expanded())"
      >
        {{ expanded() ? 'Weniger anzeigen' : 'Alle Zeiten' }}
        <span class="fw-hours-card__chev" [class.is-open]="expanded()" aria-hidden="true">⌄</span>
      </button>

      @if (expanded()) {
        <pv-fw-hours-list [rows]="hours()" variant="card" />
      }
    </aside>
  `,
  styleUrl: './fw-hours-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwHoursCardComponent {
  private readonly content = inject(FusswerkContentService);
  readonly hours = this.content.hours;
  readonly expanded = signal(false);
  readonly status = computed(() => getLiveOpenStatus(this.content.openingHours()));
  readonly week = computed(() => this.weekStrip());

  private weekStrip() {
    const today = new Date().getDay();
    const labels = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const schedule = this.content.openingHours();
    return labels.map((label, index) => ({
      key: label,
      label,
      isToday: index === today,
      isClosed: !getDayRangesMinutes(schedule, index).length,
    }));
  }
}
