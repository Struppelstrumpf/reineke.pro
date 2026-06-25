import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'pv-ws-logo',
  template: `
    <div class="ws-logo" aria-label="Weißer Schäfer · est. 2024">
      <svg class="ws-logo__arc" viewBox="0 0 240 36" aria-hidden="true">
        <defs>
          <path id="wsLogoArc" d="M 10 30 Q 120 -2 230 30" fill="none" />
        </defs>
        <text
          fill="currentColor"
          font-family="Georgia, 'Times New Roman', serif"
          font-size="16"
          font-weight="600"
          letter-spacing="0.18em"
        >
          <textPath href="#wsLogoArc" startOffset="50%" text-anchor="middle">WEISSER SCHÄFER</textPath>
        </text>
      </svg>
      <img class="ws-logo__sheep" src="/ws-sheep-mascot.svg" alt="" />
      <span class="ws-logo__est">EST. 2024</span>
    </div>
  `,
  styles: `
    :host {
      display: block;
      color: #f6f4ee;
    }
    .ws-logo {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.1rem;
      min-width: 8.5rem;
    }
    .ws-logo__arc {
      display: block;
      width: 12.2rem;
      height: 1.6rem;
      overflow: visible;
    }
    .ws-logo__sheep {
      display: block;
      width: 3.05rem;
      height: auto;
      margin-top: -0.15rem;
    }
    .ws-logo__est {
      font-size: 0.58rem;
      font-weight: 600;
      letter-spacing: 0.28em;
      color: #c8c4b8;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WsLogoComponent {}
