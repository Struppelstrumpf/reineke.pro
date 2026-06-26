import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { DogCookieService } from '../dog-cookie.service';
import { DogExploreService } from '../dog-explore.service';
import { DogPetService } from '../dog-pet.service';

@Component({
  selector: 'pv-dog-cookie-banner',
  template: `
    @if (cookies.bannerOpen()) {
      <section class="dog-cookie" aria-label="Cookie-Einstellungen">
        <p class="dog-cookie__title">Datenschutz &amp; Speicherung</p>
        <p class="dog-cookie__text">
          Essenziell für die Karte. Optional speichern wir deinen Nasebär (Tamagotchi), letzten Standort
          und Anmeldestatus — nur mit deiner Einwilligung.
          <a href="/demo/nasebaer/datenschutz" target="_blank" rel="noopener">Datenschutz</a>
        </p>
        @if (cookies.settingsOpen()) {
          <div class="dog-cookie__opts">
            <label><input type="checkbox" checked disabled /> Essenziell (Karte)</label>
            <label>
              <input type="checkbox" [checked]="cookies.functional()" (change)="cookies.functional.set($any($event.target).checked)" />
              Nasebär, Standort &amp; Konto
            </label>
            <label>
              <input type="checkbox" [checked]="cookies.statistics()" (change)="cookies.statistics.set($any($event.target).checked)" />
              Anonyme Statistik (Demo)
            </label>
          </div>
        }
        <div class="dog-cookie__actions">
          @if (cookies.settingsOpen()) {
            <button type="button" class="dog-btn dog-btn--ghost dog-btn--inline" (click)="cookies.settingsOpen.set(false)">
              Zurück
            </button>
            <button type="button" class="dog-btn dog-btn--accent dog-btn--inline" (click)="saveSelection()">
              Auswahl speichern
            </button>
          } @else {
            <button type="button" class="dog-btn dog-btn--ghost dog-btn--inline" (click)="cookies.settingsOpen.set(true)">
              Einstellungen
            </button>
            <button type="button" class="dog-btn dog-btn--ghost dog-btn--inline" (click)="reject()">Ablehnen</button>
            <button type="button" class="dog-btn dog-btn--accent dog-btn--inline" (click)="accept()">Akzeptieren</button>
          }
        </div>
      </section>
    }
  `,
  styleUrl: './dog-cookie-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogCookieBannerComponent {
  readonly cookies = inject(DogCookieService);
  private readonly pet = inject(DogPetService);
  private readonly explore = inject(DogExploreService);

  accept(): void {
    this.cookies.acceptAll();
    this.pet.reloadAfterConsent();
    this.explore.reloadAfterConsent();
  }

  reject(): void {
    this.cookies.rejectOptional();
  }

  saveSelection(): void {
    this.cookies.saveSelection();
    this.pet.reloadAfterConsent();
    this.explore.reloadAfterConsent();
  }
}
