import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { FusswerkContentService } from '../fusswerk-content.service';



@Component({

  selector: 'pv-fw-social',

  template: `

    <div class="fw-social" [class.fw-social--light]="light()" aria-label="Social Media">

      <a [href]="content.businessView().instagram" target="_blank" rel="noopener noreferrer" aria-label="Instagram">

        <svg viewBox="0 0 24 24" aria-hidden="true">

          <path

            d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 1.8A3.7 3.7 0 0 0 3.8 7.5v9a3.7 3.7 0 0 0 3.7 3.7h9a3.7 3.7 0 0 0 3.7-3.7v-9a3.7 3.7 0 0 0-3.7-3.7h-9Zm9.8 1.7a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z"

          />

        </svg>

      </a>

      <a [href]="content.businessView().facebook" target="_blank" rel="noopener noreferrer" aria-label="Facebook">

        <svg viewBox="0 0 24 24" aria-hidden="true">

          <path

            d="M13.3 22v-8.2h2.8l.5-3.2h-3.3V8.7c0-.9.3-1.6 1.7-1.6h1.8V4.2a23 23 0 0 0-2.6-.1c-2.6 0-4.4 1.6-4.4 4.6v2h-3v3.2h3V22h3.5Z"

          />

        </svg>

      </a>

    </div>

  `,

  styles: `

    .fw-social {

      display: inline-flex;

      gap: 0.35rem;

    }



    .fw-social a {

      display: grid;

      place-items: center;

      width: 2rem;

      height: 2rem;

      border-radius: 50%;

      border: 1px solid var(--fw-border);

      background: rgba(255, 255, 255, 0.75);

      color: var(--fw-muted);

      transition:

        background var(--fw-ease),

        color var(--fw-ease),

        border-color var(--fw-ease);

    }



    .fw-social a:hover {

      color: #8a6d45;

      border-color: color-mix(in srgb, var(--fw-gold) 45%, var(--fw-border));

      background: var(--fw-gold-soft);

    }



    .fw-social svg {

      width: 1rem;

      height: 1rem;

      fill: currentColor;

    }



    .fw-social--light a {

      border-color: rgba(255, 255, 255, 0.28);

      background: rgba(255, 255, 255, 0.1);

      color: rgba(255, 255, 255, 0.88);

    }



    .fw-social--light a:hover {

      background: rgba(255, 255, 255, 0.2);

      color: #fff;

      border-color: rgba(255, 255, 255, 0.45);

    }

  `,

  changeDetection: ChangeDetectionStrategy.OnPush,

})

export class FwSocialComponent {

  readonly light = input(false);

  readonly content = inject(FusswerkContentService);

}


