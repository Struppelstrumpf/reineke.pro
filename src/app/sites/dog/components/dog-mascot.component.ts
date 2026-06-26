import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { DogPetService } from '../dog-pet.service';
import {
  DOG_MASCOT_BUBBLES,
  DOG_MASCOT_POSES,
  type DogMascotPose,
} from '../dog-mascot.data';

const POSE_MS = 5200;
const FADE_MS = 380;

@Component({
  selector: 'pv-dog-mascot',
  template: `
    <svg
      class="nb-mascot"
      [class.nb-mascot--marker]="variant() === 'marker'"
      [class.nb-mascot--logo]="variant() === 'logo'"
      viewBox="0 0 64 64"
      [attr.width]="size()"
      [attr.height]="height()"
      aria-hidden="true"
    >
      @if (variant() === 'logo') {
        <defs>
          <linearGradient [attr.id]="uid + '-bg'" x1="8" y1="6" x2="56" y2="54" gradientUnits="userSpaceOnUse">
            <stop stop-color="#9ee028" />
            <stop offset="1" stop-color="#5a9010" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="28" [attr.fill]="'url(#' + uid + '-bg)'" />
        <circle cx="32" cy="32" r="28" fill="none" stroke="#ffffff" stroke-width="1.1" opacity="0.22" />
      }

      @if (displayBubble() && variant() === 'logo' && !compactBubble() && !showClose()) {
        <g class="nb-mascot__bubble" [class.nb-mascot__bubble--on]="bubbleOn()">
          <rect x="6" y="2" width="52" height="18" rx="9" fill="#ffffff" stroke="#7cb518" stroke-width="1.3" />
          <polygon points="28,20 24,24 32,20" fill="#ffffff" stroke="#7cb518" stroke-width="1.3" stroke-linejoin="round" />
          <polygon points="29,20 26,23 30,20" fill="#ffffff" />
          <text x="32" y="14" text-anchor="middle" class="nb-mascot__bubble-text">{{ displayBubble() }}</text>
        </g>
      }

      @if (showClose() && variant() === 'logo') {
        <g class="nb-mascot__close-mark">
          <circle cx="32" cy="32" r="13" fill="#ffffff" opacity="0.95" />
          <text x="32" y="36.5" text-anchor="middle" class="nb-mascot__close-x">×</text>
        </g>
      } @else {
      <g
        class="nb-mascot__dog"
        [class.nb-mascot__dog--fade]="fading()"
        transform="translate(0 4)"
      >
        @switch (displayPose()) {
          @case ('sit') {
            <g class="nb-mascot__pose nb-mascot__pose--sit">
              <ellipse cx="32" cy="42" rx="12" ry="2.2" fill="rgba(0,0,0,0.1)"/>
              <g class="nb-mascot__tail nb-mascot__tail--slow">
                <ellipse cx="17" cy="28" rx="4.8" ry="2.1" fill="#c8b898"/>
              </g>
              <ellipse cx="30" cy="30" rx="11" ry="7" fill="#e8dcc8"/>
              <ellipse cx="29" cy="31" rx="7" ry="4.8" fill="#d4c4a8"/>
              <ellipse cx="24" cy="36" rx="2" ry="3.6" fill="#c8b898"/>
              <ellipse cx="29" cy="37" rx="2" ry="3.6" fill="#c8b898"/>
              <circle cx="38" cy="26" r="5.5" fill="#e8dcc8"/>
              <ellipse cx="36.2" cy="22" rx="2.1" ry="2.8" fill="#c8b898" transform="rotate(-28 36.2 22)"/>
              <ellipse cx="36.2" cy="30" rx="2.1" ry="2.8" fill="#c8b898" transform="rotate(28 36.2 30)"/>
              <circle cx="40.2" cy="25.2" r="1.35" fill="#1c2214"/>
              <circle cx="40.55" cy="24.85" r="0.42" fill="#fff" opacity="0.9"/>
              <circle cx="42.8" cy="26.2" r="1.55" fill="#1c2214"/>
            </g>
          }
          @case ('ball') {
            <g class="nb-mascot__pose nb-mascot__pose--ball">
              <ellipse cx="32" cy="42" rx="12" ry="2.2" fill="rgba(0,0,0,0.1)"/>
              <g class="nb-mascot__tail nb-mascot__tail--fast">
                <ellipse cx="17" cy="28" rx="4.8" ry="2.1" fill="#c8b898"/>
              </g>
              <ellipse cx="28" cy="30" rx="11" ry="7" fill="#e8dcc8"/>
              <ellipse cx="27" cy="31" rx="7" ry="4.8" fill="#d4c4a8"/>
              <ellipse cx="20" cy="37" rx="1.8" ry="3.2" fill="#c8b898"/>
              <ellipse cx="25" cy="37" rx="1.8" ry="3.2" fill="#c8b898"/>
              <ellipse cx="30" cy="37" rx="1.8" ry="3.2" fill="#c8b898"/>
              <ellipse cx="34" cy="35" rx="1.8" ry="3.2" fill="#c8b898"/>
              <circle cx="39" cy="28" r="5.5" fill="#e8dcc8"/>
              <ellipse cx="37.2" cy="24" rx="2.1" ry="2.8" fill="#c8b898" transform="rotate(-28 37.2 24)"/>
              <ellipse cx="37.2" cy="32" rx="2.1" ry="2.8" fill="#c8b898" transform="rotate(28 37.2 32)"/>
              <circle cx="41.2" cy="27.2" r="1.35" fill="#1c2214"/>
              <circle cx="41.55" cy="26.85" r="0.42" fill="#fff" opacity="0.9"/>
              <circle cx="43.8" cy="28.2" r="1.55" fill="#1c2214"/>
              <g class="nb-mascot__ball">
                <circle cx="48" cy="36" r="4.2" fill="#7cb518"/>
                <path d="M46 34.5 Q48 36 50 34.5" fill="none" stroke="#ffffff" stroke-width="0.9" opacity="0.55"/>
              </g>
            </g>
          }
          @case ('sleep') {
            <g class="nb-mascot__pose nb-mascot__pose--sleep">
              <ellipse cx="34" cy="40" rx="14" ry="2.2" fill="rgba(0,0,0,0.1)"/>
              <ellipse cx="30" cy="36" rx="12" ry="6.5" fill="#e8dcc8" transform="rotate(-8 30 36)"/>
              <ellipse cx="29" cy="37" rx="8" ry="4.5" fill="#d4c4a8" transform="rotate(-8 29 37)"/>
              <circle cx="42" cy="34" r="5.2" fill="#e8dcc8"/>
              <ellipse cx="40.5" cy="31" rx="2" ry="2.6" fill="#c8b898" transform="rotate(-20 40.5 31)"/>
              <path d="M40 33.5 Q42 34.5 44 33.5" fill="none" stroke="#1c2214" stroke-width="1.1" stroke-linecap="round"/>
              <path d="M39.5 35.5 Q41.5 36.5 43.5 35.5" fill="none" stroke="#1c2214" stroke-width="1.1" stroke-linecap="round"/>
              <ellipse cx="44.5" cy="35" rx="2.2" ry="1.6" fill="#c8b898" transform="rotate(15 44.5 35)"/>
              <text x="48" y="24" class="nb-mascot__zzz">z</text>
              <text x="52" y="18" class="nb-mascot__zzz nb-mascot__zzz--2">z</text>
              <text x="56" y="12" class="nb-mascot__zzz nb-mascot__zzz--3">z</text>
            </g>
          }
          @case ('read') {
            <g class="nb-mascot__pose nb-mascot__pose--read">
              <ellipse cx="32" cy="42" rx="12" ry="2.2" fill="rgba(0,0,0,0.1)"/>
              <g class="nb-mascot__tail nb-mascot__tail--slow">
                <ellipse cx="17" cy="28" rx="4.8" ry="2.1" fill="#c8b898"/>
              </g>
              <ellipse cx="30" cy="30" rx="11" ry="7" fill="#e8dcc8"/>
              <ellipse cx="29" cy="31" rx="7" ry="4.8" fill="#d4c4a8"/>
              <ellipse cx="24" cy="36" rx="2" ry="3.6" fill="#c8b898"/>
              <ellipse cx="29" cy="37" rx="2" ry="3.6" fill="#c8b898"/>
              <circle cx="38" cy="26" r="5.5" fill="#e8dcc8"/>
              <ellipse cx="36.2" cy="22" rx="2.1" ry="2.8" fill="#c8b898" transform="rotate(-28 36.2 22)"/>
              <ellipse cx="36.2" cy="30" rx="2.1" ry="2.8" fill="#c8b898" transform="rotate(28 36.2 30)"/>
              <circle cx="40.2" cy="25.2" r="1.35" fill="#1c2214"/>
              <circle cx="40.55" cy="24.85" r="0.42" fill="#fff" opacity="0.9"/>
              <circle cx="42.8" cy="26.2" r="1.55" fill="#1c2214"/>
              <g class="nb-mascot__glasses">
                <circle cx="39.5" cy="25" r="2.4" fill="none" stroke="#646464" stroke-width="1.1"/>
                <circle cx="43.5" cy="25" r="2.4" fill="none" stroke="#646464" stroke-width="1.1"/>
                <path d="M41.9 25 h0.6" stroke="#646464" stroke-width="1"/>
              </g>
              <rect x="26" y="33" width="10" height="7" rx="1.2" fill="#8fd424"/>
              <rect x="27" y="34" width="8" height="5" rx="0.8" fill="#ffffff" opacity="0.85"/>
              <line x1="28" y1="35.5" x2="34" y2="35.5" stroke="#c8b898" stroke-width="0.7"/>
              <line x1="28" y1="37" x2="33" y2="37" stroke="#c8b898" stroke-width="0.7"/>
            </g>
          }
          @case ('glasses') {
            <g class="nb-mascot__pose nb-mascot__pose--glasses">
              <ellipse cx="32" cy="42" rx="12" ry="2.2" fill="rgba(0,0,0,0.1)"/>
              <g class="nb-mascot__tail nb-mascot__tail--slow">
                <ellipse cx="17" cy="28" rx="4.8" ry="2.1" fill="#c8b898"/>
              </g>
              <ellipse cx="28" cy="30" rx="11" ry="7" fill="#e8dcc8"/>
              <ellipse cx="27" cy="31" rx="7" ry="4.8" fill="#d4c4a8"/>
              <ellipse cx="20" cy="37" rx="1.8" ry="3.2" fill="#c8b898"/>
              <ellipse cx="25" cy="37" rx="1.8" ry="3.2" fill="#c8b898"/>
              <ellipse cx="30" cy="37" rx="1.8" ry="3.2" fill="#c8b898"/>
              <ellipse cx="34" cy="35" rx="1.8" ry="3.2" fill="#c8b898"/>
              <circle cx="39" cy="28" r="5.5" fill="#e8dcc8"/>
              <ellipse cx="37.2" cy="24" rx="2.1" ry="2.8" fill="#c8b898" transform="rotate(-28 37.2 24)"/>
              <ellipse cx="37.2" cy="32" rx="2.1" ry="2.8" fill="#c8b898" transform="rotate(28 37.2 32)"/>
              <circle cx="41.2" cy="27.2" r="1.35" fill="#1c2214"/>
              <circle cx="41.55" cy="26.85" r="0.42" fill="#fff" opacity="0.9"/>
              <circle cx="43.8" cy="28.2" r="1.55" fill="#1c2214"/>
              <g class="nb-mascot__glasses">
                <circle cx="40.5" cy="27" r="2.4" fill="none" stroke="#646464" stroke-width="1.1"/>
                <circle cx="44.5" cy="27" r="2.4" fill="none" stroke="#646464" stroke-width="1.1"/>
                <path d="M42.9 27 h0.6" stroke="#646464" stroke-width="1"/>
              </g>
            </g>
          }
          @case ('yawn') {
            <g class="nb-mascot__pose nb-mascot__pose--yawn">
              <ellipse cx="32" cy="42" rx="12" ry="2.2" fill="rgba(0,0,0,0.1)"/>
              <g class="nb-mascot__tail nb-mascot__tail--slow">
                <ellipse cx="17" cy="28" rx="4.8" ry="2.1" fill="#c8b898"/>
              </g>
              <ellipse cx="28" cy="30" rx="11" ry="7" fill="#e8dcc8"/>
              <ellipse cx="27" cy="31" rx="7" ry="4.8" fill="#d4c4a8"/>
              <ellipse cx="20" cy="37" rx="1.8" ry="3.2" fill="#c8b898"/>
              <ellipse cx="25" cy="37" rx="1.8" ry="3.2" fill="#c8b898"/>
              <ellipse cx="30" cy="37" rx="1.8" ry="3.2" fill="#c8b898"/>
              <ellipse cx="34" cy="35" rx="1.8" ry="3.2" fill="#c8b898"/>
              <circle cx="39" cy="28" r="5.5" fill="#e8dcc8"/>
              <ellipse cx="37.2" cy="24" rx="2.1" ry="2.8" fill="#c8b898" transform="rotate(-28 37.2 24)"/>
              <ellipse cx="37.2" cy="32" rx="2.1" ry="2.8" fill="#c8b898" transform="rotate(28 37.2 32)"/>
              <path d="M40 26.5 Q41.5 25.5 43 26.5" fill="none" stroke="#1c2214" stroke-width="1.1" stroke-linecap="round"/>
              <path d="M40 28.5 Q41.5 29.5 43 28.5" fill="none" stroke="#1c2214" stroke-width="1.1" stroke-linecap="round"/>
              <ellipse cx="44.2" cy="28.5" rx="2.2" ry="2.8" fill="#1c2214"/>
              <ellipse cx="44.2" cy="28.2" rx="1.4" ry="1.6" fill="#c8b898"/>
            </g>
          }
          @default {
            <g class="nb-mascot__pose nb-mascot__pose--stand">
              <ellipse cx="32" cy="42" rx="12" ry="2.2" fill="rgba(0,0,0,0.1)"/>
              <g class="nb-mascot__tail">
                <ellipse cx="17" cy="28" rx="4.8" ry="2.1" fill="#c8b898"/>
              </g>
              <ellipse cx="28" cy="30" rx="11" ry="7" fill="#e8dcc8"/>
              <ellipse cx="27" cy="31" rx="7" ry="4.8" fill="#d4c4a8"/>
              <ellipse cx="20" cy="37" rx="1.8" ry="3.2" fill="#c8b898"/>
              <ellipse cx="25" cy="37" rx="1.8" ry="3.2" fill="#c8b898"/>
              <ellipse cx="30" cy="37" rx="1.8" ry="3.2" fill="#c8b898"/>
              <ellipse cx="34" cy="35" rx="1.8" ry="3.2" fill="#c8b898"/>
              <circle cx="39" cy="28" r="5.5" fill="#e8dcc8"/>
              <ellipse cx="37.2" cy="24" rx="2.1" ry="2.8" fill="#c8b898" transform="rotate(-28 37.2 24)"/>
              <ellipse cx="37.2" cy="32" rx="2.1" ry="2.8" fill="#c8b898" transform="rotate(28 37.2 32)"/>
              <circle cx="41.2" cy="27.2" r="1.35" fill="#1c2214"/>
              <circle cx="41.55" cy="26.85" r="0.42" fill="#fff" opacity="0.9"/>
              <circle cx="43.8" cy="28.2" r="1.55" fill="#1c2214"/>
            </g>
          }
        }
      </g>
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }

    .nb-mascot {
      overflow: visible;
      flex-shrink: 0;
    }

    .nb-mascot--logo {
      filter: drop-shadow(0 3px 10px color-mix(in srgb, var(--dog-accent, #7cb518) 45%, transparent));
    }

    .nb-mascot__dog {
      transition: opacity 0.34s ease;
    }

    .nb-mascot__dog--fade {
      opacity: 0.15;
    }

    .nb-mascot__tail {
      transform-origin: 20px 28px;
      animation: nb-mascot-wag 0.55s ease-in-out infinite alternate;
    }

    .nb-mascot__tail--slow {
      animation-duration: 0.85s;
    }

    .nb-mascot__tail--fast {
      animation-duration: 0.32s;
    }

    .nb-mascot__ball {
      transform-origin: 48px 36px;
      animation: nb-mascot-bounce 0.65s ease-in-out infinite alternate;
    }

    .nb-mascot__zzz {
      font-family: var(--dog-font, system-ui, sans-serif);
      font-size: 7px;
      font-weight: 700;
      fill: var(--dog-muted, #646464);
      opacity: 0.55;
      animation: nb-mascot-float 2.4s ease-in-out infinite;
    }

    .nb-mascot__zzz--2 {
      animation-delay: 0.35s;
      opacity: 0.7;
      font-size: 8px;
    }

    .nb-mascot__zzz--3 {
      animation-delay: 0.7s;
      opacity: 0.85;
      font-size: 9px;
    }

    .nb-mascot__bubble {
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 0.28s ease, transform 0.28s cubic-bezier(0.34, 1.35, 0.64, 1);
    }

    .nb-mascot__bubble--on {
      opacity: 1;
      transform: translateY(0);
    }

    .nb-mascot__bubble-text {
      font-family: var(--dog-font, system-ui, sans-serif);
      font-size: 9px;
      font-weight: 800;
      fill: #1a2210;
    }

    .nb-mascot__close-x {
      font-family: var(--dog-font, system-ui, sans-serif);
      font-size: 18px;
      font-weight: 700;
      fill: #3d4a28;
    }

    @keyframes nb-mascot-wag {
      from { transform: rotate(-18deg); }
      to { transform: rotate(22deg); }
    }

    @keyframes nb-mascot-bounce {
      from { transform: translateY(0); }
      to { transform: translateY(-2px); }
    }

    @keyframes nb-mascot-float {
      0%, 100% { transform: translateY(0); opacity: 0.45; }
      50% { transform: translateY(-3px); opacity: 0.95; }
    }

    @media (prefers-reduced-motion: reduce) {
      .nb-mascot__tail,
      .nb-mascot__ball,
      .nb-mascot__zzz,
      .nb-mascot__dog {
        animation: none !important;
        transition: none !important;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogMascotComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly pet = inject(DogPetService);

  readonly uid = `nb-mascot-${Math.random().toString(36).slice(2, 9)}`;

  readonly variant = input<'logo' | 'marker'>('logo');
  readonly size = input(44);
  readonly animated = input(true);
  readonly petDriven = input(false);
  readonly showClose = input(false);
  readonly compactBubble = input(false);
  readonly height = computed(() => (this.variant() === 'logo' ? this.size() : Math.round(this.size() * (56 / 64))));

  readonly poseIndex = signal(0);
  readonly pose = computed((): DogMascotPose => DOG_MASCOT_POSES[this.poseIndex()]);
  readonly displayPose = computed(() => (this.petDriven() ? this.pet.mascotPose() : this.pose()));
  readonly displayBubble = computed(() => {
    if (this.petDriven()) return this.pet.mascotHint();
    return this.bubbleText();
  });
  readonly bubbleOn = computed(() => (this.petDriven() ? !!this.pet.mascotHint() : this.bubbleVisible()));

  readonly fading = signal(false);
  readonly bubbleText = signal('');
  readonly bubbleVisible = signal(false);

  private lastPetPose: DogMascotPose | null = null;

  constructor() {
    effect(() => {
      if (!this.petDriven()) return;
      const next = this.pet.mascotPose();
      if (this.lastPetPose && this.lastPetPose !== next) {
        this.fading.set(true);
        window.setTimeout(() => this.fading.set(false), 280);
      }
      this.lastPetPose = next;
    });

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      return;
    }

    interval(POSE_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cyclePose());
  }

  private cyclePose(): void {
    if (this.petDriven() || !this.animated() || this.variant() !== 'logo') return;

    this.fading.set(true);
    this.bubbleVisible.set(false);

    window.setTimeout(() => {
      let next = this.poseIndex();
      while (next === this.poseIndex()) {
        next = Math.floor(Math.random() * DOG_MASCOT_POSES.length);
      }
      this.poseIndex.set(next);
      this.fading.set(false);

      if (Math.random() < 0.42) {
        const text = DOG_MASCOT_BUBBLES[Math.floor(Math.random() * DOG_MASCOT_BUBBLES.length)];
        this.bubbleText.set(text);
        window.setTimeout(() => this.bubbleVisible.set(true), 120);
        window.setTimeout(() => this.bubbleVisible.set(false), POSE_MS - FADE_MS - 200);
      } else {
        this.bubbleText.set('');
      }
    }, FADE_MS);
  }
}
