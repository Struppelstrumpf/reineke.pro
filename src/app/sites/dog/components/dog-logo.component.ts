import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { NASEBAER_BRAND } from '../dog.data';
import { DogCookieService } from '../dog-cookie.service';
import { DogPetService } from '../dog-pet.service';
import { DogPetLauncherService } from '../dog-pet-launcher.service';
import { DogMascotComponent } from './dog-mascot.component';

@Component({
  selector: 'pv-dog-logo',
  imports: [DogMascotComponent],
  template: `
    <span class="nb-logo" [attr.aria-label]="brand.name + ' — ' + brand.slogan">
      <button
        #orb
        type="button"
        class="nb-logo__orb"
        [attr.aria-label]="launcher.showCloseInLogo() ? 'Nasebär einklappen' : 'Nasebär-Pflege öffnen'"
        (click)="onOrbClick()"
      >
        <pv-dog-mascot
          variant="logo"
          [size]="52"
          [animated]="true"
          [petDriven]="true"
          [showClose]="launcher.showCloseInLogo()"
        />
      </button>
      <span class="nb-logo__copy">
        <span class="nb-logo__name">{{ brand.name }}</span>
        <span class="nb-logo__slogan">{{ brand.slogan }}</span>
      </span>
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
      min-width: 0;
    }
    .nb-logo {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      min-width: 0;
      color: var(--dog-accent);
    }
    .nb-logo__orb {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.65rem;
      height: 2.65rem;
      padding: 0;
      margin: 0;
      border: 0;
      background: transparent;
      cursor: pointer;
      border-radius: 50%;
      line-height: 0;
      transition: transform 0.2s cubic-bezier(0.34, 1.35, 0.64, 1);
    }
    .nb-logo__orb:hover {
      transform: scale(1.06);
    }
    .nb-logo__orb:active {
      transform: scale(0.96);
    }
    .nb-logo__copy {
      display: flex;
      flex-direction: column;
      gap: 0.08rem;
      min-width: 0;
    }
    .nb-logo__name {
      font-family: var(--dog-font);
      font-size: 1.28rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      line-height: 1.12;
      color: var(--dog-text);
      white-space: nowrap;
    }
    .nb-logo__slogan {
      font-family: var(--dog-font);
      font-size: 0.72rem;
      font-weight: 500;
      color: var(--dog-muted);
      white-space: nowrap;
      line-height: 1.2;
    }
    @media (max-width: 720px) {
      .nb-logo__slogan {
        display: none;
      }
      .nb-logo__name {
        font-size: 1.05rem;
      }
    }
    @media (max-width: 520px) {
      .nb-logo__copy {
        display: none;
      }
      .nb-logo__orb pv-dog-mascot {
        transform: scale(0.9);
        transform-origin: center;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogLogoComponent {
  readonly brand = NASEBAER_BRAND;
  readonly launcher = inject(DogPetLauncherService);
  private readonly cookies = inject(DogCookieService);
  private readonly pet = inject(DogPetService);
  private readonly orbRef = viewChild<ElementRef<HTMLButtonElement>>('orb');

  onOrbClick(): void {
    if (this.launcher.showCloseInLogo()) {
      this.launcher.collapse();
      return;
    }
    if (!this.cookies.hasFunctionalConsent()) {
      this.cookies.openSettings();
      return;
    }
    const el = this.orbRef()?.nativeElement;
    if (!el) return;
    this.pet.resetDockToBottomCenter();
    this.launcher.expand(el.getBoundingClientRect());
  }
}
