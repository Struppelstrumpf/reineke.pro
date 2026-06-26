import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DogAuthService } from '../dog-auth.service';
import { DogExploreService } from '../dog-explore.service';
import { DOG_PIN_EMOJIS, DogPinsService, type DogPinDraft } from '../dog-pins.service';

@Component({
  selector: 'pv-dog-pin-sheet',
  imports: [FormsModule],
  templateUrl: './dog-pin-sheet.component.html',
  styleUrl: './dog-pin-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogPinSheetComponent {
  readonly auth = inject(DogAuthService);
  readonly pins = inject(DogPinsService);
  readonly explore = inject(DogExploreService);

  readonly emojis = DOG_PIN_EMOJIS;
  readonly emoji = signal('📍');
  readonly title = signal('');
  readonly description = signal('');
  readonly visibility = signal<'public' | 'private'>('public');
  readonly address = signal('');
  readonly lat = signal<number | null>(null);
  readonly lng = signal<number | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    const c = this.explore.center();
    this.lat.set(c.lat);
    this.lng.set(c.lng);

    effect(() => {
      const pla = this.pins.pickLat();
      const pln = this.pins.pickLng();
      if (pla != null && pln != null) {
        this.lat.set(pla);
        this.lng.set(pln);
      }
    });
  }

  startMapPick(): void {
    this.explore.closeMapPopup();
    this.explore.selectSpot(null);
    this.explore.selectAlert(null);
    this.pins.startMapPick();
    this.error.set(null);
  }

  useMyLocation(): void {
    const c = this.explore.center();
    this.lat.set(c.lat);
    this.lng.set(c.lng);
  }

  async save(): Promise<void> {
    const la = this.lat();
    const ln = this.lng();
    if (la == null || ln == null) {
      this.error.set('Bitte Standort auf der Karte wählen');
      return;
    }
    if (!this.title().trim()) {
      this.error.set('Titel eingeben');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const draft: DogPinDraft = {
      emoji: this.emoji(),
      title: this.title().trim(),
      description: this.description().trim(),
      visibility: this.visibility(),
      lat: la,
      lng: ln,
      address: this.address().trim(),
    };
    const pin = await this.pins.create(draft);
    this.saving.set(false);
    if (!pin) {
      this.error.set('Speichern fehlgeschlagen');
      return;
    }
    await this.explore.reloadPins();
    this.pins.closeSheet();
  }

  close(): void {
    this.pins.closeSheet();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.pins.sheetOpen()) this.close();
  }
}
