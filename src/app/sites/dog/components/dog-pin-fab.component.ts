import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DogAuthService } from '../dog-auth.service';
import { DogPinsService } from '../dog-pins.service';

@Component({
  selector: 'pv-dog-pin-fab',
  template: `
    @if (auth.user()) {
      <button type="button" class="dog-pin-fab" aria-label="Eigenen Marker setzen" (click)="pins.openSheet()">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
      </button>
    }
  `,
  styleUrl: './dog-pin-fab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogPinFabComponent {
  readonly auth = inject(DogAuthService);
  readonly pins = inject(DogPinsService);
}
