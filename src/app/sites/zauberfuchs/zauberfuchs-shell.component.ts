import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ZF_BRAND } from './zauberfuchs.data';
import { ZfViewportService } from './zf-viewport.service';

@Component({
  selector: 'pv-zauberfuchs-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div
      class="zf-site"
      [attr.data-device]="vp.device()"
      [style.--zf-scroll-dim]="scrollDim()"
    >
      <div class="zf-nav-host">
        <div class="zf-wrap">
            <header class="zf-nav" [class.zf-nav--open]="menuOpen()">
            <a class="zf-brand" routerLink="./" (click)="closeMenu()">
              <img
                class="zf-brand__mark"
                src="/zauberfuchs/zauberfuchs-mark.png"
                width="44"
                height="44"
                alt=""
              />
              <span class="zf-brand__text">
                <span class="zf-brand__name">{{ brand.name }}</span>
                <span class="zf-brand__sub">{{ brand.product }}</span>
              </span>
            </a>

            @if (isCompact()) {
              <button
                type="button"
                class="zf-nav__burger"
                (click)="toggleMenu()"
                [attr.aria-expanded]="menuOpen()"
                aria-controls="zf-nav-panel"
                aria-label="Menü"
              >
                <span></span><span></span><span></span>
              </button>
            }

            <nav
              id="zf-nav-panel"
              class="zf-nav__links"
              aria-label="Hauptnavigation"
              [class.zf-nav__links--drawer]="isCompact()"
            >
              <a
                class="zf-nav__chip"
                routerLink="./"
                routerLinkActive="active"
                [routerLinkActiveOptions]="exactActive"
                (click)="closeMenu()"
                >Welt</a
              >
              <a class="zf-nav__chip" routerLink="briefe" routerLinkActive="active" (click)="closeMenu()"
                >Zauberpost</a
              >
              <a class="zf-nav__chip" routerLink="abo" routerLinkActive="active" (click)="closeMenu()"
                >Ausgaben</a
              >
              <a class="zf-nav__chip" routerLink="shop" routerLinkActive="active" (click)="closeMenu()"
                >Erinnerungen</a
              >
              @if (isCompact()) {
                <a class="zf-nav__cta zf-nav__cta--drawer" routerLink="briefe" (click)="closeMenu()"
                  >Post öffnen</a
                >
              }
            </nav>

            @if (!isCompact()) {
              <a class="zf-nav__cta" routerLink="briefe">Post öffnen</a>
            }
          </header>
        </div>
      </div>

      @if (menuOpen() && isCompact()) {
        <button type="button" class="zf-nav__scrim" aria-label="Menü schließen" (click)="closeMenu()"></button>
      }

      <div class="zf-site__content">
        <router-outlet />

        <footer class="zf-footer">
          <div class="zf-footer__glow" aria-hidden="true"></div>
          <div class="zf-wrap zf-footer__inner">
            <div class="zf-footer__brand">
              <img
                class="zf-footer__fox"
                src="/zauberfuchs/zauberfuchs-mark.png"
                width="72"
                height="72"
                alt="Zauberfuchs"
              />
              <div>
                <strong>{{ brand.name }}</strong>
                <p>{{ brand.tagline }}</p>
                <p class="zf-footer__whisper">Mit Liebe aus dem Zauberwald · Band I</p>
              </div>
            </div>

            <nav class="zf-footer__links" aria-label="Fußnavigation">
              <a routerLink="./">Welt</a>
              <a routerLink="briefe">Zauberpost</a>
              <a routerLink="abo">Ausgaben</a>
              <a routerLink="shop">Erinnerungen</a>
              <a routerLink="impressum">Impressum</a>
              <a [href]="'mailto:' + brand.email">{{ brand.email }}</a>
            </nav>

            <div class="zf-footer__made">
              <span class="zf-footer__made-label">Made by &#64;</span>
              <a
                class="zf-footer__reineke"
                href="https://reineke.pro"
                target="_blank"
                rel="noopener noreferrer"
                title="Reineke GbR"
              >
                <img src="/reineke-logo.png" width="120" height="120" alt="Reineke GbR" />
                <span>Reineke GbR</span>
              </a>
            </div>
          </div>
          <p class="zf-footer__seal zf-wrap">✧ Langsam wachsen. Schön bleiben. ✧</p>
        </footer>
      </div>
    </div>
  `,
  styleUrls: ['./zauberfuchs-shared.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZauberfuchsShellComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly brand = ZF_BRAND;
  readonly vp = inject(ZfViewportService);
  readonly menuOpen = signal(false);
  readonly scrollDim = signal('0');

  readonly isCompact = computed(() => this.vp.device() === 'mobile');

  readonly exactActive: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    fragment: 'ignored',
    matrixParams: 'ignored',
  };

  constructor() {
    if (typeof document !== 'undefined') {
      document.title = `${ZF_BRAND.name} · ${ZF_BRAND.product}`;
      document.documentElement.lang = 'de';
      const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (icon) icon.href = '/zauberfuchs/zauberfuchs-mark.png';
    }

    afterNextRender(() => {
      const onScroll = (): void => {
        const max = Math.max(1, window.innerHeight * 1.1);
        const t = Math.min(1, window.scrollY / max);
        this.scrollDim.set(String(t * 0.62));
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
    });
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
