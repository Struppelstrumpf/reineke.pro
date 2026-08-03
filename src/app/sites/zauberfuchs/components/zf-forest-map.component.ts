import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Vollflächige gemalte Waldwelt hinter Hero und Menü. */
@Component({
  selector: 'pv-zf-forest-map',
  standalone: true,
  template: `
    <div class="zf-map" aria-hidden="true">
      <div class="zf-map__paint"></div>
      <div class="zf-map__wash"></div>
      <div class="zf-map__vignette"></div>
    </div>
  `,
  styles: [
    `
      :host {
        position: absolute;
        inset: 0;
        z-index: 1;
        pointer-events: none;
        overflow: hidden;
      }

      .zf-map {
        position: absolute;
        inset: 0;
      }

      .zf-map__paint {
        position: absolute;
        inset: -3%;
        background-image: url('/zauberfuchs/zauberwald-hero.png');
        background-position: 50% 46%;
        background-size: cover;
        background-repeat: no-repeat;
        transform-origin: 50% 46%;
        animation: zf-wobble 56s ease-in-out infinite;
        filter: saturate(1.04) contrast(1.02);
        will-change: transform;
      }

      .zf-map__wash {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          115deg,
          rgba(20, 12, 34, 0.14) 0%,
          transparent 42%,
          rgba(20, 12, 34, 0.08) 100%
        );
        opacity: 0.85;
      }

      .zf-map__vignette {
        position: absolute;
        inset: 0;
        background: radial-gradient(
          ellipse 85% 80% at 50% 42%,
          transparent 55%,
          rgba(10, 5, 18, 0.1) 100%
        );
      }

      @keyframes zf-wobble {
        0%,
        100% {
          transform: scale(1.02) translate(0%, 0%) rotate(0deg);
        }
        25% {
          transform: scale(1.035) translate(-0.45%, 0.3%) rotate(-0.06deg);
        }
        50% {
          transform: scale(1.025) translate(0.4%, -0.35%) rotate(0.05deg);
        }
        75% {
          transform: scale(1.04) translate(-0.25%, 0.2%) rotate(-0.04deg);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .zf-map__paint {
          animation: none !important;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZfForestMapComponent {}
