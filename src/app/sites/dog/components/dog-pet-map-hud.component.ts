import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { DogPetMapGameService } from '../dog-pet-map-game.service';



@Component({

  selector: 'pv-dog-pet-map-hud',

  template: `

    @if (game.playing()) {

      <div class="map-hud map-hud--bottom" [attr.data-game]="game.active()">

        <div class="map-hud__head">

          <span class="map-hud__icon" aria-hidden="true">{{ game.actionIcon() }}</span>

          <div class="map-hud__info">

            <span class="map-hud__title">{{ game.title() }}</span>

            <span class="map-hud__hint">{{ game.hint() }}</span>

          </div>

          <div class="map-hud__timer-wrap">

            <span class="map-hud__timer" [class.map-hud__timer--urgent]="game.secondsLeft() <= 10">

              {{ game.secondsLeft() }}s

            </span>

          </div>

          <button type="button" class="map-hud__cancel" (click)="game.cancel()" aria-label="Spiel abbrechen">

            ×

          </button>

        </div>



        @if (game.statusMessage()) {

          <p class="map-hud__live" role="status">{{ game.statusMessage() }}</p>

        }



        <div class="map-hud__meta">

          <div class="map-hud__boosts" aria-label="Was verbessert sich">

            @for (boost of game.boostPreview(); track boost) {

              <span class="map-hud__chip">{{ boost }}</span>

            }

          </div>

          @if (game.streak() >= 2) {

            <span class="map-hud__streak">Combo ×{{ game.streak() }}</span>

          }

        </div>



        <div class="map-hud__track-wrap">

          <div class="map-hud__track" role="progressbar" [attr.aria-valuenow]="game.progress()" aria-valuemin="0" aria-valuemax="100">

            <div class="map-hud__fill" [style.width.%]="game.progress()"></div>

          </div>

          <span class="map-hud__count">

            @if (game.moving()) {

              <span class="map-hud__running">läuft …</span>

            } @else {

              {{ game.stats().done }}/{{ game.stats().goal }}

            }

          </span>

        </div>

      </div>

    }

    @if (game.flash(); as msg) {

      <div class="map-hud__toast map-hud__toast--result" role="status">{{ msg }}</div>

    }

  `,

  styles: `

    :host {

      position: absolute;

      inset: 0;

      z-index: 450;

      pointer-events: none;

    }

    .map-hud--bottom {

      position: absolute;

      left: 50%;

      bottom: clamp(0.65rem, 2vw, 1rem);

      transform: translateX(-50%);

      width: min(28rem, calc(100% - 1.5rem));

      pointer-events: auto;

    }

    .map-hud__head {

      display: grid;

      grid-template-columns: auto 1fr auto auto;

      gap: 0.45rem 0.5rem;

      align-items: start;

      padding: 0.65rem 0.75rem 0.45rem;

      border-radius: 18px 18px 0 0;

      border: 1px solid color-mix(in srgb, var(--dog-accent) 28%, var(--dog-border));

      border-bottom: 0;

      background: color-mix(in srgb, var(--dog-surface-solid, #fff) 94%, transparent);

      backdrop-filter: blur(18px);

    }

    .map-hud__icon {

      font-size: 1.35rem;

      line-height: 1;

      margin-top: 0.05rem;

    }

    .map-hud__info {

      min-width: 0;

    }

    .map-hud__title {

      display: block;

      font-size: 0.8rem;

      font-weight: 700;

      letter-spacing: -0.01em;

    }

    .map-hud__hint {

      display: block;

      margin-top: 0.12rem;

      font-size: 0.62rem;

      line-height: 1.35;

      color: var(--dog-muted);

    }

    .map-hud__timer-wrap {

      text-align: right;

    }

    .map-hud__timer {

      display: inline-block;

      min-width: 2.4rem;

      padding: 0.15rem 0.45rem;

      border-radius: 999px;

      font-size: 0.68rem;

      font-weight: 800;

      font-variant-numeric: tabular-nums;

      color: var(--dog-accent-strong);

      background: color-mix(in srgb, var(--dog-accent) 12%, var(--dog-surface));

      border: 1px solid color-mix(in srgb, var(--dog-accent) 25%, var(--dog-border));

    }

    .map-hud__timer--urgent {

      color: #c2410c;

      border-color: color-mix(in srgb, #ea580c 40%, var(--dog-border));

      background: color-mix(in srgb, #fed7aa 55%, var(--dog-surface));

      animation: map-hud-pulse 0.85s ease infinite;

    }

    .map-hud__cancel {

      width: 1.65rem;

      height: 1.65rem;

      border: 1px solid var(--dog-border);

      border-radius: 50%;

      background: transparent;

      color: var(--dog-muted);

      font-size: 1rem;

      line-height: 1;

      cursor: pointer;

    }

    .map-hud__cancel:hover {

      color: var(--dog-text);

      border-color: color-mix(in srgb, var(--dog-accent) 35%, var(--dog-border));

    }

    .map-hud__live {

      margin: 0;

      padding: 0.35rem 0.75rem;

      font-size: 0.68rem;

      font-weight: 650;

      line-height: 1.35;

      color: var(--dog-accent-strong);

      background: color-mix(in srgb, var(--dog-accent) 8%, var(--dog-surface-solid, #fff));

      border-left: 1px solid color-mix(in srgb, var(--dog-accent) 28%, var(--dog-border));

      border-right: 1px solid color-mix(in srgb, var(--dog-accent) 28%, var(--dog-border));

      animation: map-hud-live 0.25s ease;

    }

    .map-hud__meta {

      display: flex;

      flex-wrap: wrap;

      align-items: center;

      gap: 0.35rem 0.5rem;

      padding: 0.35rem 0.75rem;

      border-left: 1px solid color-mix(in srgb, var(--dog-accent) 28%, var(--dog-border));

      border-right: 1px solid color-mix(in srgb, var(--dog-accent) 28%, var(--dog-border));

      background: color-mix(in srgb, var(--dog-surface-solid, #fff) 92%, transparent);

    }

    .map-hud__boosts {

      display: flex;

      flex-wrap: wrap;

      gap: 0.28rem;

      flex: 1;

    }

    .map-hud__chip {

      font-size: 0.56rem;

      font-weight: 700;

      padding: 0.12rem 0.42rem;

      border-radius: 999px;

      color: var(--dog-accent-strong);

      background: color-mix(in srgb, var(--dog-accent) 10%, var(--dog-surface));

      border: 1px solid color-mix(in srgb, var(--dog-accent) 22%, var(--dog-border));

    }

    .map-hud__streak {

      font-size: 0.62rem;

      font-weight: 800;

      color: #c2410c;

      white-space: nowrap;

    }

    .map-hud__track-wrap {

      display: flex;

      align-items: center;

      gap: 0.5rem;

      padding: 0.45rem 0.75rem 0.65rem;

      border-radius: 0 0 18px 18px;

      border: 1px solid color-mix(in srgb, var(--dog-accent) 28%, var(--dog-border));

      border-top: 1px solid color-mix(in srgb, var(--dog-border) 65%, transparent);

      background: color-mix(in srgb, var(--dog-surface-solid, #fff) 93%, transparent);

      box-shadow:

        0 1px 0 color-mix(in srgb, white 40%, transparent) inset,

        0 12px 36px rgba(0, 0, 0, 0.16);

      backdrop-filter: blur(18px);

    }

    .map-hud__track {

      flex: 1;

      height: 0.48rem;

      border-radius: 999px;

      background: color-mix(in srgb, var(--dog-border) 70%, transparent);

      overflow: hidden;

    }

    .map-hud__fill {

      height: 100%;

      border-radius: inherit;

      background: linear-gradient(90deg, var(--dog-accent), var(--dog-accent-strong));

      transition: width 0.3s ease;

    }

    .map-hud__count {

      font-size: 0.64rem;

      font-weight: 700;

      font-variant-numeric: tabular-nums;

      color: var(--dog-accent-strong);

      white-space: nowrap;

      min-width: 3.2rem;

      text-align: right;

    }

    .map-hud__running {

      font-size: 0.6rem;

      color: var(--dog-muted);

    }

    .map-hud__toast {

      position: absolute;

      bottom: 5.5rem;

      left: 50%;

      transform: translateX(-50%);

      max-width: min(24rem, calc(100% - 2rem));

      padding: 0.75rem 1rem;

      border-radius: 16px;

      border: 1px solid color-mix(in srgb, var(--dog-accent) 40%, var(--dog-border));

      background: color-mix(in srgb, var(--dog-surface-solid, #fff) 96%, transparent);

      box-shadow: 0 10px 32px rgba(0, 0, 0, 0.12);

      font-size: 0.72rem;

      font-weight: 650;

      line-height: 1.45;

      text-align: center;

      color: var(--dog-accent-strong);

      pointer-events: none;

      animation: map-hud-pop 0.35s ease;

    }

    .map-hud__toast--result {

      border-color: color-mix(in srgb, #22c55e 35%, var(--dog-border));

      background: color-mix(in srgb, #dcfce7 40%, var(--dog-surface-solid, #fff));

    }

    @keyframes map-hud-pop {

      from {

        opacity: 0;

        transform: translateX(-50%) translateY(8px);

      }

      to {

        opacity: 1;

        transform: translateX(-50%) translateY(0);

      }

    }

    @keyframes map-hud-live {

      from {

        opacity: 0;

        transform: translateY(-4px);

      }

      to {

        opacity: 1;

        transform: translateY(0);

      }

    }

    @keyframes map-hud-pulse {
      50% {
        transform: scale(1.04);
      }
    }

    @media (max-width: 640px) {
      .map-hud--bottom {
        bottom: calc(4.8rem + env(safe-area-inset-bottom, 0px));
        width: min(100%, calc(100% - 1rem));
      }
      .map-hud__toast {
        bottom: calc(8.5rem + env(safe-area-inset-bottom, 0px));
      }
    }
  `,

  changeDetection: ChangeDetectionStrategy.OnPush,

})

export class DogPetMapHudComponent {

  readonly game = inject(DogPetMapGameService);

}

