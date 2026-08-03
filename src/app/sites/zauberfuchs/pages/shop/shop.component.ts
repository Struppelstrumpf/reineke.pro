import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ZF_SHOP } from '../../zauberfuchs.data';

@Component({
  selector: 'pv-zf-shop',
  imports: [RouterLink],
  template: `
    <section class="zf-page zf-wrap">
      <header class="zf-page__head">
        <p class="zf-kicker">Erinnerungsstücke</p>
        <h1>Alles stammt aus derselben Welt</h1>
        <p>
          Tränke aus dem Kräuterhain, Karten aus Nox’ Bibliothek, Figuren als Bewohner —
          Shop nur zur Stimmung (kein echter Checkout).
        </p>
      </header>

      <div class="zf-ornament" aria-hidden="true">
        <img src="/zauberfuchs/divider-branch.png?v=5" alt="" width="380" height="64" />
      </div>

      <div class="zf-shop">
        @for (item of items; track item.id) {
          <article class="zf-item">
            <span class="zf-item__tag">{{ item.tag }} · {{ item.origin }}</span>
            <h2>{{ item.name }}</h2>
            <p>{{ item.blurb }}</p>
            <div class="zf-item__row">
              <strong>{{ item.price }}</strong>
              <button type="button" (click)="fakeAdd(item.name)">Mitnehmen</button>
            </div>
          </article>
        }
      </div>

      @if (toast()) {
        <p class="zf-toast" role="status">{{ toast() }}</p>
      }

      <div class="zf-ornament zf-ornament--hat" aria-hidden="true">
        <img src="/zauberfuchs/divider-hat.png?v=5" alt="" width="140" height="44" />
      </div>

      <aside class="zf-shop-note">
        <h2>Für Erwachsene kurz gesagt</h2>
        <p>
          Preise sind Demo-Werte. Es gibt keinen versteckten Abo-Zwang — und wenn der echte Kauf
          kommt, bleibt er klar und ruhig.
        </p>
        <a routerLink="../abo">Zu den Ausgaben & Eltern-Infos →</a>
      </aside>

      <p class="zf-back"><a routerLink="../">← Zurück in den Zauberwald</a></p>
    </section>
  `,
  styles: [
    `
      .zf-page {
        position: relative;
        padding: 6.5rem 0 3rem;
      }

      .zf-page__head {
        position: relative;
        z-index: 4;
        max-width: 40rem;
        margin: 0 auto;
        text-align: center;
      }

      .zf-kicker {
        margin: 0 0 0.35rem;
        color: var(--zf-moon);
        letter-spacing: 0.14em;
        text-transform: uppercase;
        font-size: 0.78rem;
        font-weight: 800;
      }

      .zf-page__head h1 {
        margin: 0 0 0.6rem;
        font-family: var(--zf-display);
        font-size: clamp(2rem, 5vw, 3rem);
      }

      .zf-page__head p {
        margin: 0;
        color: var(--zf-muted);
        line-height: 1.6;
      }

      .zf-ornament {
        position: relative;
        z-index: 4;
        display: grid;
        place-items: center;
        padding: 1.4rem 0 1.8rem;
      }

      .zf-ornament img {
        width: min(380px, 70vw);
        height: auto;
        opacity: 0.9;
        filter: drop-shadow(0 10px 20px rgba(4, 2, 12, 0.5)) brightness(0.9) contrast(1.05);
      }

      .zf-ornament--hat img {
        width: min(140px, 34vw);
      }

      .zf-shop {
        position: relative;
        z-index: 4;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1.05rem;
        align-items: stretch;
      }

      .zf-item {
        display: flex;
        flex-direction: column;
        min-height: 100%;
        padding: 1.3rem 1.2rem;
        border-radius: 22px;
        background: linear-gradient(165deg, rgba(30, 18, 52, 0.82), rgba(8, 4, 18, 0.92));
        border: 1px solid rgba(201, 168, 240, 0.14);
        box-shadow: 0 18px 40px rgba(4, 2, 12, 0.35);
        gap: 0.45rem;
        transition: border-color 200ms ease, transform 200ms ease;
      }

      .zf-item:hover {
        border-color: rgba(242, 228, 176, 0.28);
        transform: translateY(-2px);
      }

      .zf-item__tag {
        align-self: flex-start;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--zf-moon);
      }

      .zf-item h2 {
        margin: 0;
        font-family: var(--zf-display);
        font-size: 1.2rem;
        min-height: 2.6em;
      }

      .zf-item p {
        margin: 0;
        flex: 1 1 auto;
        color: var(--zf-muted);
        font-size: 0.95rem;
        line-height: 1.5;
      }

      .zf-item__row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-top: auto;
        padding-top: 0.85rem;
        min-height: 2.75rem;
      }

      .zf-item__row strong {
        color: var(--zf-bloom);
        font-size: 1.05rem;
      }

      .zf-item__row button {
        min-height: 2.35rem;
        padding: 0.5rem 0.95rem;
        border-radius: 999px;
        font-weight: 700;
        font-size: 0.85rem;
        background: rgba(154, 111, 212, 0.22);
        border: 1px solid rgba(154, 111, 212, 0.45);
        white-space: nowrap;
      }

      .zf-toast {
        position: relative;
        z-index: 4;
        margin-top: 1.25rem;
        padding: 0.95rem 1.1rem;
        border-radius: 14px;
        background: rgba(92, 61, 138, 0.3);
        border: 1px solid rgba(201, 168, 240, 0.3);
      }

      .zf-shop-note {
        position: relative;
        z-index: 4;
        max-width: 36rem;
        margin: 0 auto;
        text-align: center;
        padding: 1.4rem 1.3rem;
        border-radius: 20px;
        background: rgba(10, 6, 20, 0.75);
        border: 1px solid rgba(242, 228, 176, 0.16);
      }

      .zf-shop-note h2 {
        margin: 0 0 0.45rem;
        font-family: var(--zf-display);
        font-size: 1.25rem;
        color: var(--zf-moon);
      }

      .zf-shop-note p {
        margin: 0 0 0.85rem;
        color: var(--zf-muted);
        line-height: 1.55;
      }

      .zf-shop-note a {
        color: var(--zf-lilac);
        font-weight: 700;
      }

      .zf-back {
        position: relative;
        z-index: 4;
        margin-top: 2rem;
        text-align: center;
        color: var(--zf-lilac);
      }

      @media (max-width: 900px) {
        .zf-shop {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 560px) {
        .zf-shop {
          grid-template-columns: 1fr;
        }

        .zf-item h2 {
          min-height: 0;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZfShopComponent {
  readonly items = ZF_SHOP;
  readonly toast = signal('');

  fakeAdd(name: string): void {
    this.toast.set(`„${name}“ liegt bereit — Lumi würde es liefern. (Demo, kein Kauf.)`);
  }
}
