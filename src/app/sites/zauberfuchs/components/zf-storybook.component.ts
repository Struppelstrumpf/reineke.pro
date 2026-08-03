import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ZF_COMIC_STORY, type ZfComicPage } from '../zauberfuchs.data';

/**
 * Zauberheft: feste Heftgröße, komplette Bildseiten
 * (Panels & Sprachblasen im Artwork — eigene Zauberfuchs-Serie).
 */
@Component({
  selector: 'pv-zf-storybook',
  standalone: true,
  template: `
    <div class="zf-tome" role="region" [attr.aria-label]="'Zauberheft: ' + story.title">
      <div class="zf-tome__stage" tabindex="0" (keydown)="onKey($event)">
        <div
          class="zf-tome__book"
          [class.zf-tome__book--flip]="flipping()"
          [class.zf-tome__book--back]="flipDir() === 'back'"
          [class.zf-tome__book--cover]="page().kind === 'cover'"
          (click)="onPageClick($event)"
        >
          <div class="zf-tome__rim" aria-hidden="true"></div>
          <div class="zf-tome__spine" aria-hidden="true"></div>
          <img
            class="zf-tome__bookmark"
            src="/zauberfuchs/book/bookmark-ornate.webp"
            alt=""
            aria-hidden="true"
          />

          <div class="zf-tome__viewport">
            <img
              class="zf-tome__art"
              [class.zf-tome__art--cover]="page().kind === 'cover'"
              [src]="page().image"
              [alt]="page().alt"
              draggable="false"
              decoding="async"
              fetchpriority="high"
            />
            <div class="zf-tome__age" aria-hidden="true"></div>
            <div class="zf-tome__crease" aria-hidden="true"></div>
          </div>
        </div>

        <div class="zf-tome__nav">
          <button type="button" (click)="prev(); $event.stopPropagation()" [disabled]="index() === 0">
            ← Zurück
          </button>
          <span>{{ page().label }} · {{ index() + 1 }} / {{ total }}</span>
          <button
            type="button"
            (click)="next(); $event.stopPropagation()"
            [disabled]="index() >= total - 1"
          >
            Weiter →
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .zf-tome {
        width: min(980px, 100%);
        margin-inline: auto;
      }

      .zf-tome__stage {
        outline: none;
      }

      /* Immer gleiche Buchgröße — unabhängig vom Inhalt */
      .zf-tome__book {
        --tome-h: clamp(420px, 58vw, 560px);
        position: relative;
        width: 100%;
        height: var(--tome-h);
        margin-bottom: 1rem;
        padding: 14px 12px 16px 18px;
        border-radius: 10px 14px 14px 10px;
        background:
          linear-gradient(145deg, #5a3a22 0%, #3a2414 40%, #24150c 78%, #1a0e08 100%);
        box-shadow:
          0 28px 55px rgba(0, 0, 0, 0.55),
          inset 0 1px 0 rgba(255, 220, 160, 0.12),
          inset 0 0 0 1px rgba(100, 65, 30, 0.55);
        cursor: pointer;
        overflow: visible;
        box-sizing: border-box;
      }

      .zf-tome__rim {
        position: absolute;
        inset: 7px;
        border-radius: 6px 10px 10px 6px;
        border: 1px solid rgba(201, 168, 106, 0.28);
        pointer-events: none;
        z-index: 4;
      }

      .zf-tome__spine {
        position: absolute;
        left: 0;
        top: 5%;
        bottom: 5%;
        width: 16px;
        border-radius: 3px 0 0 3px;
        background:
          repeating-linear-gradient(180deg, #6b4426 0 5px, #3d2412 5px 10px),
          linear-gradient(90deg, #1a0e08, #5a3820);
        box-shadow: 4px 0 14px rgba(0, 0, 0, 0.45);
        z-index: 5;
      }

      .zf-tome__bookmark {
        position: absolute;
        top: -10px;
        right: 16%;
        width: 26px;
        height: auto;
        z-index: 6;
        pointer-events: none;
        filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.4));
      }

      .zf-tome__viewport {
        position: relative;
        width: 100%;
        height: 100%;
        border-radius: 3px;
        overflow: hidden;
        background: #2a1a10;
        box-shadow:
          inset 0 0 0 1px rgba(60, 35, 15, 0.5),
          0 2px 0 rgba(0, 0, 0, 0.25);
      }

      .zf-tome__art {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        user-select: none;
        -webkit-user-drag: none;
      }

      /* Cover: immer voll im gleichen Viewport, leicht letterbox */
      .zf-tome__art--cover {
        object-fit: contain;
        background: linear-gradient(160deg, #3a2414, #1a0e08);
      }

      .zf-tome__age {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(ellipse at 20% 10%, rgba(255, 240, 200, 0.08), transparent 50%),
          radial-gradient(ellipse at 85% 90%, rgba(90, 50, 20, 0.18), transparent 45%),
          linear-gradient(180deg, transparent 60%, rgba(40, 20, 8, 0.12));
        mix-blend-mode: multiply;
        opacity: 0.55;
      }

      .zf-tome__crease {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 50%;
        width: 18px;
        transform: translateX(-50%);
        pointer-events: none;
        background: linear-gradient(
          90deg,
          rgba(40, 20, 8, 0.18),
          rgba(10, 5, 0, 0.35) 45%,
          rgba(255, 245, 210, 0.06) 50%,
          rgba(10, 5, 0, 0.35) 55%,
          rgba(40, 20, 8, 0.18)
        );
        opacity: 0.85;
      }

      .zf-tome__book--cover .zf-tome__crease {
        display: none;
      }

      .zf-tome__nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
      }

      .zf-tome__nav span {
        font-size: 0.88rem;
        color: var(--zf-muted);
        text-align: center;
      }

      .zf-tome__nav button {
        padding: 0.6rem 1rem;
        border: 1px solid rgba(201, 168, 106, 0.45);
        background: rgba(30, 18, 40, 0.8);
        color: var(--zf-bloom);
        font-weight: 750;
        font-size: 0.9rem;
        border-radius: 4px;
      }

      .zf-tome__nav button:disabled {
        opacity: 0.35;
      }

      .zf-tome__book--flip {
        animation: zf-tome-turn 620ms cubic-bezier(0.22, 1, 0.36, 1);
      }

      .zf-tome__book--back {
        animation-name: zf-tome-turn-back;
      }

      @keyframes zf-tome-turn {
        0% {
          transform: rotateY(0);
        }
        40% {
          transform: rotateY(-7deg) scale(0.985);
          filter: brightness(0.88);
        }
        100% {
          transform: rotateY(0);
        }
      }

      @keyframes zf-tome-turn-back {
        0% {
          transform: rotateY(0);
        }
        40% {
          transform: rotateY(7deg) scale(0.985);
          filter: brightness(0.9);
        }
        100% {
          transform: rotateY(0);
        }
      }

      @media (max-width: 640px) {
        .zf-tome__book {
          --tome-h: clamp(280px, 72vw, 380px);
          padding: 10px 8px 12px 14px;
        }

        .zf-tome__bookmark {
          width: 20px;
          right: 12%;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .zf-tome__book--flip {
          animation: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZfStorybookComponent {
  readonly story = ZF_COMIC_STORY;
  readonly pages = ZF_COMIC_STORY.pages as readonly ZfComicPage[];
  readonly total = this.pages.length;

  readonly index = signal(0);
  readonly flipping = signal(false);
  readonly flipDir = signal<'next' | 'back'>('next');

  readonly page = computed(() => this.pages[this.index()]);

  private flipTimer: ReturnType<typeof setTimeout> | null = null;

  next(): void {
    if (this.index() >= this.total - 1 || this.flipping()) return;
    this.animate('next', () => this.index.update((i) => i + 1));
  }

  prev(): void {
    if (this.index() <= 0 || this.flipping()) return;
    this.animate('back', () => this.index.update((i) => i - 1));
  }

  onKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault();
      this.next();
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      this.prev();
    }
  }

  onPageClick(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement;
    const x = event.clientX - el.getBoundingClientRect().left;
    if (x > el.clientWidth * 0.55) this.next();
    else if (x < el.clientWidth * 0.45) this.prev();
  }

  private animate(dir: 'next' | 'back', apply: () => void): void {
    this.flipDir.set(dir);
    this.flipping.set(true);
    if (this.flipTimer) clearTimeout(this.flipTimer);
    this.flipTimer = setTimeout(() => {
      apply();
      this.flipping.set(false);
      this.flipTimer = null;
    }, 280);
  }
}
