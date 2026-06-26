import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DogThemeService } from '../dog-theme.service';

@Component({
  selector: 'pv-dog-theme-toggle',
  template: `
    <div class="dog-theme" role="group" aria-label="Hell- und Dunkelmodus">
      <span class="dog-theme__label" aria-hidden="true">Hell</span>
      <label class="dog-theme__track">
        <span class="sr-only">Modus wechseln</span>
        <input
          type="range"
          class="dog-theme__slider"
          min="0"
          max="1"
          step="1"
          [value]="theme.isDark() ? 1 : 0"
          (input)="onSlide($event)"
        />
      </label>
      <span class="dog-theme__label" aria-hidden="true">Dunkel</span>
    </div>
  `,
  styleUrl: './dog-theme-toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogThemeToggleComponent {
  readonly theme = inject(DogThemeService);

  onSlide(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.theme.setMode(value === 1 ? 'dark' : 'light');
  }
}
