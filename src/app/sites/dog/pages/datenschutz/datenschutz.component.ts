import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'pv-dog-datenschutz',
  imports: [RouterLink],
  template: `
    <article class="dog-legal">
      <h1>Datenschutz — Nasebär Demo</h1>
      <p>
        Diese Portfolio-Demo speichert optional deinen Nasebär-Pflegestatus, den letzten Kartenausschnitt
        und Anmeldedaten nur mit Einwilligung (funktionale Cookies) lokal und — bei Anmeldung — auf dem
        Demo-Backend.
      </p>
      <h2>Was wird gespeichert?</h2>
      <ul>
        <li><strong>Essenziell:</strong> Kartenansicht, Theme — für die Nutzung der Seite.</li>
        <li><strong>Funktional (optional):</strong> Tamagotchi-Status, Dock-Position, Standort, Session-Token.</li>
        <li><strong>Statistik (optional):</strong> In dieser Demo derzeit keine externen Tracker.</li>
      </ul>
      <h2>Anmeldung</h2>
      <p>
        Google, Discord und Microsoft sind in dieser Demo simuliert. Es werden zufällige Session-Token
        (256 Bit) serverseitig gespeichert — kein echtes OAuth ohne Produktiv-Setup.
      </p>
      <p><a routerLink="/demo/nasebaer">Zurück zur Karte</a></p>
    </article>
  `,
  styles: `
    .dog-legal {
      max-width: 36rem;
      margin: 5rem auto 2rem;
      padding: 1rem 1.25rem;
      font-family: var(--dog-font, system-ui, sans-serif);
      color: var(--dog-text, #1a2210);
      line-height: 1.55;
    }
    h1 { font-size: 1.35rem; margin: 0 0 0.75rem; }
    h2 { font-size: 1rem; margin: 1rem 0 0.35rem; }
    a { color: var(--dog-accent-strong, #6aa015); font-weight: 600; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogDatenschutzComponent {}
