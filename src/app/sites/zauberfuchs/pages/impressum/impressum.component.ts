import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ZF_BRAND } from '../../zauberfuchs.data';

@Component({
  selector: 'pv-zf-impressum',
  imports: [RouterLink],
  template: `
    <section class="zf-page zf-wrap">
      <h1>Impressum</h1>
      <p>
        <strong>{{ brand.name }}</strong> ist ein Projektauftritt im Rahmen von Reineke GbR.
        Inhalte und Shop sind derzeit Demonstrationszwecke (kein echter Verkauf).
        Vision: ein gemütliches Universum — Vorfreude auf Post, Sammeln, Staunen.
      </p>
      <p>
        Kontakt:
        <a [href]="'mailto:' + brand.email">{{ brand.email }}</a>
      </p>
      <p><a routerLink="../">← Zurück</a></p>
    </section>
  `,
  styles: [
    `
      .zf-page {
        padding: 6.5rem 0 2.5rem;
        max-width: 36rem;
      }

      h1 {
        font-family: var(--zf-display);
        margin: 0 0 1rem;
      }

      p {
        color: var(--zf-muted);
        line-height: 1.55;
      }

      a {
        color: var(--zf-lilac);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZfImpressumComponent {
  readonly brand = ZF_BRAND;
}
