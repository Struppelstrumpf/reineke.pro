import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FW_BUSINESS } from '../fusswerk.data';

@Component({
  selector: 'pv-fw-logo',
  template: `
    @if (claimOnly()) {
      <span
        class="fw-logo fw-logo--claim"
        [class.fw-logo--light]="light()"
        role="img"
        [attr.aria-label]="biz.claim"
      >
        <span class="fw-logo__script">{{ biz.claim }}</span>
        <span class="fw-logo__ornament" aria-hidden="true">
          <span class="fw-logo__ornament-line"></span>
          <svg class="fw-logo__ornament-leaf" viewBox="0 0 28 16" aria-hidden="true">
            <path d="M14 2 C10 6 8 10 14 14 C20 10 18 6 14 2 Z" />
            <path d="M6 8 C8 11 11 13 14 13 C11 9 9 6 6 8 Z" transform="rotate(-24 14 8)" />
            <path d="M22 8 C20 11 17 13 14 13 C17 9 19 6 22 8 Z" transform="rotate(24 14 8)" />
          </svg>
          <span class="fw-logo__ornament-line"></span>
        </span>
      </span>
    } @else if (header() || markOnly()) {
      <span
        class="fw-logo fw-logo--mark"
        [class.fw-logo--header]="header()"
        [class.fw-logo--light]="light()"
        role="img"
        [attr.aria-label]="biz.name"
      >
        <span class="fw-logo__word">FUSSWERK</span>
        <span class="fw-logo__rule" aria-hidden="true"></span>
      </span>
    } @else if (hero()) {
      <span
        class="fw-logo fw-logo--hero"
        [class.fw-logo--light]="light()"
        role="img"
        [attr.aria-label]="biz.name + ' — ' + biz.claim"
      >
        <span class="fw-logo__mark">
          <span class="fw-logo__word">FUSSWERK</span>
          <span class="fw-logo__rule" aria-hidden="true"></span>
          <span class="fw-logo__studio">{{ biz.tagline }}</span>
        </span>
        <span class="fw-logo__claim">
          <span class="fw-logo__script">{{ biz.claim }}</span>
          <span class="fw-logo__ornament" aria-hidden="true">
            <span class="fw-logo__ornament-line"></span>
            <svg class="fw-logo__ornament-leaf" viewBox="0 0 28 16" aria-hidden="true">
              <path d="M14 2 C10 6 8 10 14 14 C20 10 18 6 14 2 Z" />
              <path d="M6 8 C8 11 11 13 14 13 C11 9 9 6 6 8 Z" transform="rotate(-24 14 8)" />
              <path d="M22 8 C20 11 17 13 14 13 C17 9 19 6 22 8 Z" transform="rotate(24 14 8)" />
            </svg>
            <span class="fw-logo__ornament-line"></span>
          </span>
        </span>
      </span>
    } @else {
      <span
        class="fw-logo fw-logo--stacked"
        [class.fw-logo--compact]="compact()"
        [class.fw-logo--light]="light()"
        role="img"
        [attr.aria-label]="biz.name + ' — ' + biz.claim"
      >
        <span class="fw-logo__mark">
          <span class="fw-logo__word">FUSSWERK</span>
          <span class="fw-logo__rule" aria-hidden="true"></span>
        </span>
        <span class="fw-logo__claim">
          <span class="fw-logo__script">{{ biz.claim }}</span>
          <span class="fw-logo__ornament" aria-hidden="true">
            <span class="fw-logo__ornament-line"></span>
            <svg class="fw-logo__ornament-leaf" viewBox="0 0 28 16" aria-hidden="true">
              <path d="M14 2 C10 6 8 10 14 14 C20 10 18 6 14 2 Z" />
              <path d="M6 8 C8 11 11 13 14 13 C11 9 9 6 6 8 Z" transform="rotate(-24 14 8)" />
              <path d="M22 8 C20 11 17 13 14 13 C17 9 19 6 22 8 Z" transform="rotate(24 14 8)" />
            </svg>
            <span class="fw-logo__ornament-line"></span>
          </span>
        </span>
      </span>
    }
  `,
  styles: `
    .fw-logo {
      color: var(--fw-logo-color, var(--fw-accent-deep, var(--fw-ink)));
    }

    .fw-logo--light {
      --fw-logo-color: #ffffff;
    }

    .fw-logo__word {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-weight: 600;
      letter-spacing: 0.18em;
      line-height: 1;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .fw-logo__rule {
      display: block;
      width: 100%;
      height: 2px;
      border-radius: 999px;
      background: currentColor;
      opacity: 0.9;
    }

    .fw-logo__studio {
      font-family: 'Montserrat', system-ui, sans-serif;
      font-size: 0.48rem;
      font-weight: 500;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      line-height: 1.2;
      opacity: 0.88;
      padding-top: 0.15rem;
      white-space: nowrap;
    }

    .fw-logo__claim {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 0.28rem;
    }

    .fw-logo__script {
      font-family: 'Great Vibes', cursive;
      font-weight: 400;
      line-height: 1;
      white-space: nowrap;
      opacity: 0.98;
    }

    .fw-logo__ornament {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      width: 100%;
      max-width: 9rem;
    }

    .fw-logo__ornament-line {
      flex: 1;
      height: 1px;
      background: currentColor;
      opacity: 0.82;
    }

    .fw-logo__ornament-leaf {
      width: 1.1rem;
      height: auto;
      flex-shrink: 0;
      fill: currentColor;
      opacity: 0.92;
    }

    .fw-logo--mark {
      display: inline-flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0.2rem;
    }

    .fw-logo--mark .fw-logo__word {
      font-size: 0.95rem;
      letter-spacing: 0.14em;
    }

    .fw-logo--header .fw-logo__word {
      font-size: clamp(0.72rem, 3.4vw, 0.9rem);
      letter-spacing: 0.12em;
    }

    .fw-logo--claim {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.32rem;
    }

    .fw-logo--claim .fw-logo__script {
      font-size: clamp(1.35rem, 4.5vw, 1.75rem);
    }

    .fw-logo--claim .fw-logo__ornament {
      max-width: 10rem;
    }

    .fw-logo--stacked {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.55rem;
    }

    .fw-logo--stacked .fw-logo__mark {
      display: inline-flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0.2rem;
    }

    .fw-logo--stacked .fw-logo__word {
      font-size: 0.95rem;
      letter-spacing: 0.14em;
    }

    .fw-logo--stacked .fw-logo__script {
      font-size: 1.05rem;
    }

    .fw-logo--stacked .fw-logo__ornament {
      max-width: 6.5rem;
    }

    .fw-logo--compact.fw-logo--stacked .fw-logo__word {
      font-size: 0.78rem;
    }

    .fw-logo--compact.fw-logo--stacked .fw-logo__script {
      font-size: 0.9rem;
    }

    .fw-logo--hero {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      text-align: center;
    }

    .fw-logo--hero .fw-logo__mark {
      display: inline-flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0.2rem;
    }

    .fw-logo--hero .fw-logo__word {
      font-size: clamp(2rem, 8vw, 2.75rem);
      letter-spacing: 0.22em;
    }

    .fw-logo--hero .fw-logo__studio {
      font-size: 0.62rem;
      letter-spacing: 0.34em;
    }

    .fw-logo--hero .fw-logo__script {
      font-size: clamp(1.6rem, 6vw, 2.2rem);
    }

    .fw-logo--hero .fw-logo__ornament {
      max-width: 12rem;
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
  readonly markOnly = input(false);
  readonly claimOnly = input(false);
  readonly biz = FW_BUSINESS;
}
