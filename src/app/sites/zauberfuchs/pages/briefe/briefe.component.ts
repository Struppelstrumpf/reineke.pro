import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ZF_BRAND, ZF_LETTER_BEATS, ZF_SAMPLE_ISSUE } from '../../zauberfuchs.data';

@Component({
  selector: 'pv-zf-briefe',
  imports: [RouterLink],
  template: `
    <section class="zf-page zf-wrap">
      <header class="zf-page__head">
        <p class="zf-kicker">{{ brand.product }}</p>
        <h1>Nummerierte Ausgaben mit Seele</h1>
        <p>
          Jede Entscheidung soll sich nach Zauberfuchs anfühlen. Kein Produkt ohne Geschichte —
          handgemacht, langsam, zum Sammeln.
        </p>
      </header>

      <div class="zf-ornament" aria-hidden="true">
        <img src="/zauberfuchs/divider-hat.png?v=5" alt="" width="160" height="48" />
      </div>

      <div class="zf-split">
        <article class="zf-issue">
          <div class="zf-issue__seal" aria-hidden="true">✧</div>
          <p class="zf-issue__no">{{ sample.number }}</p>
          <h2>{{ sample.subtitle }}</h2>
          <p class="zf-issue__teaser">{{ sample.teaser }}</p>
          <p class="zf-issue__price">13,90 € · Demo-Vormerkung</p>
          <a class="zf-btn" routerLink="../abo">Diese Ausgabe vormerken</a>
        </article>

        <figure class="zf-still">
          <img
            src="/zauberfuchs/zauberpost-stillleben.png"
            width="800"
            height="600"
            alt="Zauberpost Stillleben"
          />
        </figure>
      </div>

      <div class="zf-ornament zf-ornament--wide" aria-hidden="true">
        <img src="/zauberfuchs/divider-branch.png?v=5" alt="" width="420" height="64" />
      </div>

      <h2 class="zf-section-title">Was im Päckchen wartet</h2>
      <ol class="zf-pack">
        @for (b of beats; track b.title; let i = $index) {
          <li>
            <span class="zf-pack__n">{{ i + 1 }}</span>
            <div>
              <h3>{{ b.title }}</h3>
              <p>{{ b.text }}</p>
            </div>
          </li>
        }
      </ol>

      <div class="zf-cta-row">
        <a class="zf-btn" routerLink="../abo">Ausgabe vormerken</a>
        <a class="zf-link" routerLink="../shop">Weitere Erinnerungsstücke</a>
      </div>
    </section>
  `,
  styles: [
    `
      .zf-page {
        position: relative;
        padding: 6.5rem 0 3rem;
      }

      .zf-page__head,
      .zf-ornament,
      .zf-split,
      .zf-section-title,
      .zf-pack,
      .zf-cta-row {
        position: relative;
        z-index: 4;
      }

      .zf-page__head {
        max-width: 38rem;
        margin: 0 auto 0.5rem;
        text-align: center;
      }

      .zf-kicker {
        margin: 0 0 0.4rem;
        color: var(--zf-moon);
        letter-spacing: 0.16em;
        text-transform: uppercase;
        font-size: 0.74rem;
        font-weight: 800;
      }

      .zf-page__head h1 {
        margin: 0 0 0.7rem;
        font-family: var(--zf-display);
        font-size: clamp(2.1rem, 5vw, 3.2rem);
        line-height: 1.05;
      }

      .zf-page__head p {
        margin: 0;
        color: var(--zf-muted);
        line-height: 1.65;
        font-size: 1.05rem;
      }

      .zf-ornament {
        display: grid;
        place-items: center;
        padding: 1.4rem 0 1.8rem;
      }

      .zf-ornament img {
        width: min(150px, 36vw);
        height: auto;
        opacity: 0.9;
        filter: drop-shadow(0 10px 20px rgba(4, 2, 12, 0.5)) brightness(0.9) contrast(1.05);
      }

      .zf-ornament--wide img {
        width: min(380px, 70vw);
      }

      .zf-split {
        display: grid;
        grid-template-columns: 1.05fr 0.95fr;
        gap: 1.75rem;
        align-items: stretch;
        margin-bottom: 0.5rem;
      }

      .zf-issue {
        position: relative;
        padding: 2rem 1.65rem 1.65rem;
        border-radius: 28px;
        background:
          linear-gradient(165deg, rgba(48, 32, 72, 0.55), rgba(12, 6, 24, 0.88)),
          rgba(8, 4, 16, 0.9);
        border: 1px solid rgba(242, 228, 176, 0.22);
        box-shadow:
          0 28px 60px rgba(4, 2, 12, 0.55),
          inset 0 1px 0 rgba(255, 248, 236, 0.06);
        display: flex;
        flex-direction: column;
        min-height: 100%;
      }

      .zf-issue__seal {
        position: absolute;
        top: -0.85rem;
        right: 1.4rem;
        width: 2.6rem;
        height: 2.6rem;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: radial-gradient(circle at 35% 30%, #f3e6b8, #c9a227);
        color: #3d1f6e;
        font-weight: 700;
        box-shadow: 0 10px 24px rgba(242, 228, 176, 0.28);
      }

      .zf-issue__no {
        margin: 0;
        font-weight: 800;
        letter-spacing: 0.14em;
        color: var(--zf-lilac);
        font-size: 0.85rem;
      }

      .zf-issue h2 {
        margin: 0.4rem 0 0.65rem;
        font-family: var(--zf-display);
        font-size: 1.85rem;
        color: var(--zf-bloom);
      }

      .zf-issue__teaser {
        margin: 0 0 1rem;
        color: var(--zf-muted);
        line-height: 1.65;
        flex: 1;
      }

      .zf-issue__price {
        margin: 0 0 1.1rem;
        font-weight: 800;
        color: var(--zf-moon);
      }

      .zf-issue .zf-btn {
        margin-top: auto;
        width: 100%;
        min-height: 2.85rem;
        justify-content: center;
      }

      .zf-still {
        margin: 0;
        min-height: 100%;
      }

      .zf-still img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        border-radius: 28px;
        border: 1px solid rgba(242, 228, 176, 0.16);
        box-shadow: 0 28px 60px rgba(4, 2, 12, 0.5);
        min-height: 280px;
      }

      .zf-section-title {
        margin: 0 0 1.1rem;
        text-align: center;
        font-family: var(--zf-display);
        font-size: clamp(1.5rem, 3vw, 2rem);
        color: var(--zf-bloom);
      }

      .zf-pack {
        margin: 0;
        padding: 0;
        list-style: none;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem 1.2rem;
        align-items: stretch;
      }

      .zf-pack li {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.9rem;
        align-items: start;
        padding: 1.15rem 1.15rem;
        border-radius: 20px;
        background: rgba(14, 8, 28, 0.72);
        border: 1px solid rgba(212, 184, 240, 0.12);
        min-height: 100%;
      }

      .zf-pack__n {
        width: 2rem;
        height: 2rem;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: rgba(242, 228, 176, 0.12);
        border: 1px solid rgba(242, 228, 176, 0.25);
        color: var(--zf-moon);
        font-weight: 800;
        font-size: 0.85rem;
      }

      .zf-pack h3 {
        margin: 0 0 0.25rem;
        font-family: var(--zf-display);
        color: var(--zf-moon);
        font-size: 1.15rem;
        min-height: 1.4em;
      }

      .zf-pack p {
        margin: 0;
        color: var(--zf-muted);
        line-height: 1.5;
        font-size: 0.94rem;
      }

      .zf-cta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: center;
        justify-content: center;
        margin-top: 2.4rem;
      }

      .zf-btn {
        display: inline-flex;
        align-items: center;
        padding: 0.9rem 1.35rem;
        border-radius: 999px;
        font-weight: 800;
        background: linear-gradient(135deg, #c49af0, #7a52b5 65%);
        color: white;
        box-shadow: 0 14px 34px rgba(110, 74, 158, 0.4);
        width: fit-content;
      }

      .zf-link {
        color: var(--zf-lilac);
        font-weight: 700;
      }

      @media (max-width: 900px) {
        .zf-split {
          grid-template-columns: 1fr;
        }

        .zf-still {
          order: -1;
        }

        .zf-pack {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZfBriefeComponent {
  readonly brand = ZF_BRAND;
  readonly beats = ZF_LETTER_BEATS;
  readonly sample = ZF_SAMPLE_ISSUE;
}
