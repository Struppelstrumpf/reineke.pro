import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FW_BUSINESS } from '../fusswerk.data';

@Component({
  selector: 'pv-fw-logo',
  template: `
    @if (minimal()) {
      <span
        class="fw-logo fw-logo--minimal"
        [class.fw-logo--header]="header()"
        [class.fw-logo--light]="light()"
        role="img"
        [attr.aria-label]="biz.name"
      >
        <span class="fw-logo__word">FUSSWERK</span>
        <span class="fw-logo__rule" aria-hidden="true"></span>
      </span>
    } @else {
      <span
        class="fw-logo"
        [class.fw-logo--compact]="compact()"
        [class.fw-logo--hero]="hero()"
        [class.fw-logo--light]="light()"
      >
        <svg
          class="fw-logo__svg"
          [attr.viewBox]="hero() ? '0 0 400 148' : '0 0 320 118'"
          overflow="visible"
          role="img"
          [attr.aria-label]="biz.name + ' ' + biz.tagline"
        >
          <text
            class="fw-logo__brand"
            [attr.x]="hero() ? 200 : 160"
            y="42"
            text-anchor="middle"
          >
            FUSSWERK
          </text>
          <text
            class="fw-logo__script"
            [attr.x]="hero() ? 200 : 160"
            y="78"
            text-anchor="middle"
          >
            {{ biz.claim }}
          </text>
          <g class="fw-logo__leaf" [attr.transform]="hero() ? 'translate(200 92)' : 'translate(160 92)'">
            <path d="M0 -10 C-8 -2 -8 8 0 14 C8 8 8 -2 0 -10 Z" />
            <path d="M-14 2 C-10 8 -2 12 0 12 C2 12 10 8 14 2 C8 -2 0 -2 -14 2 Z" transform="rotate(-28)" />
            <path d="M14 2 C10 8 2 12 0 12 C-2 12 -10 8 -14 2 C-8 -2 0 -2 14 2 Z" transform="rotate(28)" />
          </g>
          @if (!compact()) {
            <text class="fw-logo__studio" [attr.x]="hero() ? 200 : 160" y="114" text-anchor="middle">
              {{ biz.tagline }}
            </text>
          }
        </svg>
      </span>
    }
  `,
  styles: `
    .fw-logo {
      display: inline-block;
      color: var(--fw-logo-color, var(--fw-accent-deep));
    }

    .fw-logo--light {
      --fw-logo-color: #ffffff;
    }

    .fw-logo__svg {
      display: block;
      width: min(15rem, 72vw);
      height: auto;
      overflow: visible;
    }

    .fw-logo--compact .fw-logo__svg {
      width: 7.5rem;
    }

    .fw-logo--hero .fw-logo__svg {
      width: min(22rem, 88vw);
    }

    .fw-logo__brand {
      font-family: 'Montserrat', system-ui, sans-serif;
      font-size: 34px;
      font-weight: 700;
      letter-spacing: 0.34em;
      fill: currentColor;
    }

    .fw-logo--compact .fw-logo__brand {
      font-size: 20px;
      letter-spacing: 0.22em;
    }

    .fw-logo--hero .fw-logo__brand {
      font-size: 42px;
      letter-spacing: 0.36em;
    }

    .fw-logo__script {
      font-family: 'Great Vibes', cursive;
      font-size: 30px;
      font-weight: 400;
      fill: currentColor;
      opacity: 0.96;
    }

    .fw-logo--compact .fw-logo__script {
      font-size: 20px;
    }

    .fw-logo--hero .fw-logo__script {
      font-size: 36px;
    }

    .fw-logo__leaf path {
      fill: currentColor;
      opacity: 0.92;
    }

    .fw-logo__studio {
      font-family: 'Montserrat', system-ui, sans-serif;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.34em;
      text-transform: uppercase;
      fill: currentColor;
      opacity: 0.82;
    }

    .fw-logo--hero .fw-logo__studio {
      font-size: 12px;
    }

    .fw-logo--minimal {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.22rem;
      color: var(--fw-logo-color, var(--fw-ink));
    }

    .fw-logo__word {
      font-family: 'Montserrat', system-ui, sans-serif;
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.32em;
      line-height: 1;
      padding-right: 0.32em;
    }

    .fw-logo__rule {
      display: block;
      width: 100%;
      height: 2px;
      border-radius: 999px;
      background: currentColor;
      opacity: 0.88;
      align-self: stretch;
    }

    .fw-logo--header .fw-logo__word {
      font-size: clamp(0.72rem, 3.4vw, 0.9rem);
      letter-spacing: 0.2em;
      padding-right: 0.2em;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FwLogoComponent {
  readonly compact = input(false);
  readonly minimal = input(false);
  readonly header = input(false);
  readonly hero = input(false);
  readonly light = input(false);
  readonly biz = FW_BUSINESS;
}
