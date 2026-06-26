import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DogExploreService } from '../dog-explore.service';
import { DogMobileService } from '../dog-mobile.service';
import { DogPetLauncherService } from '../dog-pet-launcher.service';

@Component({
  selector: 'pv-dog-mobile-nav',
  template: `
    <nav class="dog-mnav" aria-label="Hauptmenü">
      <button
        type="button"
        class="dog-mnav__btn"
        [class.is-active]="explore.panelOpen()"
        (click)="togglePlaces()"
      >
        <span class="dog-mnav__ico" aria-hidden="true">📍</span>
        <span class="dog-mnav__lbl">Orte</span>
      </button>
      <button type="button" class="dog-mnav__btn" (click)="mobile.toggleSearch()">
        <span class="dog-mnav__ico" aria-hidden="true">🔍</span>
        <span class="dog-mnav__lbl">Suche</span>
      </button>
      <button type="button" class="dog-mnav__btn dog-mnav__btn--accent" (click)="openPet()">
        <span class="dog-mnav__ico" aria-hidden="true">🐕</span>
        <span class="dog-mnav__lbl">Nasebär</span>
      </button>
      <button
        type="button"
        class="dog-mnav__btn"
        [class.is-active]="mobile.menuOpen()"
        (click)="mobile.toggleMenu()"
      >
        <span class="dog-mnav__ico" aria-hidden="true">☰</span>
        <span class="dog-mnav__lbl">Menü</span>
      </button>
    </nav>
  `,
  styles: `
    :host {
      display: contents;
    }
    .dog-mnav {
      position: fixed;
      left: 50%;
      bottom: max(0.45rem, env(safe-area-inset-bottom));
      transform: translateX(-50%);
      z-index: 580;
      width: min(24rem, calc(100% - 1rem));
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.25rem;
      padding: 0.35rem;
      border-radius: 18px;
      border: 1px solid var(--dog-border);
      background: color-mix(in srgb, var(--dog-surface-solid, #fff) 94%, transparent);
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.16);
      backdrop-filter: blur(16px);
    }
    .dog-mnav__btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.08rem;
      min-height: 3rem;
      padding: 0.25rem 0.15rem;
      border: 0;
      border-radius: 12px;
      background: transparent;
      color: var(--dog-muted);
      font: inherit;
      cursor: pointer;
    }
    .dog-mnav__btn.is-active,
    .dog-mnav__btn--accent {
      color: var(--dog-accent-strong);
      background: color-mix(in srgb, var(--dog-accent) 12%, var(--dog-surface));
    }
    .dog-mnav__ico {
      font-size: 1.05rem;
      line-height: 1;
    }
    .dog-mnav__lbl {
      font-size: 0.52rem;
      font-weight: 700;
      line-height: 1.1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogMobileNavComponent {
  readonly mobile = inject(DogMobileService);
  readonly explore = inject(DogExploreService);
  readonly launcher = inject(DogPetLauncherService);

  togglePlaces(): void {
    this.mobile.closeSearch();
    this.explore.panelOpen.update((v) => !v);
  }

  openPet(): void {
    this.mobile.closeAll();
    const orb = document.querySelector<HTMLElement>('.nb-logo__orb');
    if (orb) {
      this.launcher.toggle(orb.getBoundingClientRect());
    }
  }
}
