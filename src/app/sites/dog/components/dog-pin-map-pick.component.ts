import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DogPinsService } from '../dog-pins.service';

@Component({
  selector: 'pv-dog-pin-map-pick',
  imports: [DecimalPipe],
  template: `
    @if (pins.mapPickActive()) {
      <div class="dog-pin-map-pick" role="region" aria-live="polite">
        <div class="dog-pin-map-pick__halo" aria-hidden="true"></div>

        <div class="dog-pin-map-pick__bar">
          @if (pins.mapPickPreview(); as preview) {
            <p class="dog-pin-map-pick__text">
              Standort gewählt
              <span class="dog-pin-map-pick__coords">
                {{ preview.lat | number: '1.4-4' }}, {{ preview.lng | number: '1.4-4' }}
              </span>
            </p>
            <div class="dog-pin-map-pick__actions">
              <button type="button" class="dog-pin-map-pick__btn dog-pin-map-pick__btn--primary" (click)="pins.confirmMapPick()">
                Bestätigen
              </button>
              <button type="button" class="dog-pin-map-pick__btn" (click)="pins.rejectMapPick()">
                Ablehnen
              </button>
              <button type="button" class="dog-pin-map-pick__btn dog-pin-map-pick__btn--ghost" (click)="pins.cancelMapPick()">
                Abbrechen
              </button>
            </div>
          } @else {
            <p class="dog-pin-map-pick__text dog-pin-map-pick__text--pulse">
              Tippe auf die Karte, um deinen Marker zu setzen
            </p>
            <div class="dog-pin-map-pick__actions">
              <button type="button" class="dog-pin-map-pick__btn dog-pin-map-pick__btn--ghost" (click)="pins.cancelMapPick()">
                Abbrechen
              </button>
            </div>
          }
        </div>
      </div>
    }
  `,
  styleUrl: './dog-pin-map-pick.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogPinMapPickComponent {
  readonly pins = inject(DogPinsService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.pins.mapPickActive()) {
      this.pins.cancelMapPick();
    }
  }
}
