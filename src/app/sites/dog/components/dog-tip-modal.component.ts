import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { DogTipArticle } from '../dog-tips.data';

@Component({
  selector: 'pv-dog-tip-modal',
  template: `
    @if (article(); as a) {
      <div class="dog-tip-modal" (click)="closed.emit()" (keydown.escape)="closed.emit()" tabindex="-1">
        <div
          class="dog-tip-modal__panel"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="'dog-tip-title-' + a.id"
          (click)="$event.stopPropagation()"
        >
          <button type="button" class="dog-tip-modal__close" (click)="closed.emit()" aria-label="Schließen">
            ×
          </button>
          <p class="dog-tip-modal__emoji" aria-hidden="true">{{ a.emoji }}</p>
          <h2 class="dog-tip-modal__title" [id]="'dog-tip-title-' + a.id">{{ a.title }}</h2>
          <p class="dog-tip-modal__lead">{{ a.lead }}</p>
          @for (section of a.sections; track section.body) {
            <div class="dog-tip-modal__section">
              @if (section.heading) {
                <h3 class="dog-tip-modal__heading">{{ section.heading }}</h3>
              }
              <p class="dog-tip-modal__body">{{ section.body }}</p>
            </div>
          }
          <button type="button" class="dog-btn dog-btn--accent" (click)="closed.emit()">Alles klar!</button>
        </div>
      </div>
    }
  `,
  styleUrl: './dog-tip-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogTipModalComponent {
  readonly article = input<DogTipArticle | null>(null);
  readonly closed = output<void>();
}
