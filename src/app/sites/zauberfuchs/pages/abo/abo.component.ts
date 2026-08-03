import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ZF_BRAND, ZF_PARENTS, ZF_PLANS } from '../../zauberfuchs.data';

@Component({
  selector: 'pv-zf-abo',
  imports: [RouterLink],
  template: `
    <section class="zf-page zf-wrap">
      <header class="zf-page__head">
        <p class="zf-kicker">Ausgaben</p>
        <h1>Erst die Welt — dann das Abo</h1>
        <p>
          Organisches Wachstum. Die einzelne Zauberpost steht im Mittelpunkt; ein Abo kommt erst,
          wenn es sich wirklich nach Zauberfuchs anfühlt.
        </p>
      </header>

      <div class="zf-ornament" aria-hidden="true">
        <img src="/zauberfuchs/divider-hat.webp" alt="" width="160" height="48" loading="lazy" decoding="async" />
      </div>

      <div class="zf-plans">
        @for (plan of plans; track plan.id) {
          <article class="zf-plan" [class.zf-plan--featured]="plan.featured">
            @if (plan.featured) {
              <span class="zf-plan__badge">Jetzt spürbar</span>
            }
            <div class="zf-plan__body">
              <h2>{{ plan.name }}</h2>
              <p class="zf-plan__price">{{ plan.price }} <span>/ {{ plan.cadence }}</span></p>
              <p class="zf-plan__blurb">{{ plan.blurb }}</p>
              <ul>
                @for (perk of plan.perks; track perk) {
                  <li>{{ perk }}</li>
                }
              </ul>
            </div>
            <button type="button" class="zf-btn" (click)="pretendSubscribe(plan.name)">
              {{ selected() === plan.name ? 'Auf der Warteliste ✧' : 'Vormerken (Demo)' }}
            </button>
          </article>
        }
      </div>

      @if (note()) {
        <p class="zf-note" role="status">{{ note() }}</p>
      }

      <div class="zf-ornament zf-ornament--wide" aria-hidden="true">
        <img src="/zauberfuchs/divider-branch.webp" alt="" width="420" height="64" loading="lazy" decoding="async" />
      </div>

      <section class="zf-parents" id="eltern">
        <header class="zf-parents__head">
          <p class="zf-kicker">{{ parents.kicker }}</p>
          <h2>{{ parents.title }}</h2>
          <p>{{ parents.lead }}</p>
        </header>
        <div class="zf-parents__grid">
          @for (point of parents.points; track point.title) {
            <article>
              <h3>{{ point.title }}</h3>
              <p>{{ point.text }}</p>
            </article>
          }
        </div>
        <a class="zf-mail" [href]="'mailto:' + brand.email">Fragen? {{ brand.email }}</a>
      </section>

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

      .zf-page__head > p:last-child {
        margin: 0;
        color: var(--zf-muted);
        line-height: 1.6;
      }

      .zf-ornament {
        position: relative;
        z-index: 4;
        display: grid;
        place-items: center;
        padding: 1.35rem 0 1.75rem;
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

      .zf-plans {
        position: relative;
        z-index: 4;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1.2rem;
        align-items: stretch;
      }

      .zf-plan {
        position: relative;
        display: flex;
        flex-direction: column;
        min-height: 100%;
        padding: 1.7rem 1.45rem 1.35rem;
        border-radius: 26px;
        background: linear-gradient(165deg, rgba(28, 16, 48, 0.85), rgba(8, 4, 18, 0.92));
        border: 1px solid rgba(201, 168, 240, 0.14);
        box-shadow: 0 22px 48px rgba(4, 2, 12, 0.4);
      }

      .zf-plan--featured {
        background: linear-gradient(165deg, rgba(90, 58, 40, 0.28), rgba(22, 12, 40, 0.92));
        border-color: rgba(242, 228, 176, 0.35);
        box-shadow: 0 28px 56px rgba(80, 48, 120, 0.28);
      }

      .zf-plan__badge {
        position: absolute;
        top: 1rem;
        right: 1rem;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #2a1840;
        background: var(--zf-moon);
        padding: 0.25rem 0.55rem;
        border-radius: 999px;
      }

      .zf-plan__body {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
      }

      .zf-plan h2 {
        margin: 0 0 0.4rem;
        padding-right: 5.5rem;
        font-family: var(--zf-display);
        font-size: 1.55rem;
      }

      .zf-plan__price {
        margin: 0 0 0.7rem;
        font-size: 1.45rem;
        font-weight: 800;
        color: var(--zf-bloom);
      }

      .zf-plan__price span {
        font-size: 0.88rem;
        font-weight: 600;
        color: var(--zf-muted);
      }

      .zf-plan__blurb {
        margin: 0 0 1rem;
        color: var(--zf-muted);
        line-height: 1.5;
      }

      .zf-plan ul {
        margin: 0 0 1.35rem;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 0.45rem;
        flex: 1 1 auto;
      }

      .zf-plan li {
        padding-left: 1.1rem;
        position: relative;
        font-size: 0.95rem;
      }

      .zf-plan li::before {
        content: '✧';
        position: absolute;
        left: 0;
        color: var(--zf-moon);
      }

      .zf-btn {
        margin-top: auto;
        width: 100%;
        min-height: 2.85rem;
        padding: 0.9rem 1rem;
        border-radius: 999px;
        font-weight: 700;
        background: linear-gradient(135deg, #9a6fd4, #5c3d8a);
        color: white;
      }

      .zf-note {
        position: relative;
        z-index: 4;
        margin: 1.25rem 0 0;
        padding: 0.95rem 1.1rem;
        border-radius: 16px;
        background: rgba(122, 158, 114, 0.14);
        border: 1px solid rgba(122, 158, 114, 0.3);
        color: var(--zf-bloom);
      }

      .zf-parents {
        position: relative;
        z-index: 4;
        padding: 0.5rem 0 0.5rem;
      }

      .zf-parents__head {
        max-width: 40rem;
        margin: 0 auto 1.35rem;
        text-align: center;
      }

      .zf-parents__head h2 {
        margin: 0 0 0.55rem;
        font-family: var(--zf-display);
        font-size: clamp(1.6rem, 3.5vw, 2.2rem);
      }

      .zf-parents__head p:last-child {
        margin: 0;
        color: var(--zf-muted);
        line-height: 1.6;
      }

      .zf-parents__grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
        margin-bottom: 1.25rem;
        align-items: stretch;
      }

      .zf-parents__grid article {
        display: flex;
        flex-direction: column;
        padding: 1.25rem 1.2rem;
        border-radius: 18px;
        background: rgba(10, 6, 20, 0.78);
        border: 1px solid rgba(242, 228, 176, 0.14);
        min-height: 100%;
      }

      .zf-parents__grid h3 {
        margin: 0 0 0.4rem;
        font-family: var(--zf-display);
        color: var(--zf-moon);
        font-size: 1.1rem;
      }

      .zf-parents__grid p {
        margin: 0;
        color: var(--zf-muted);
        line-height: 1.5;
        font-size: 0.94rem;
        flex: 1;
      }

      .zf-mail {
        display: block;
        text-align: center;
        color: var(--zf-lilac);
        font-weight: 700;
      }

      .zf-back {
        position: relative;
        z-index: 4;
        margin-top: 2.2rem;
        text-align: center;
        color: var(--zf-lilac);
      }

      @media (max-width: 700px) {
        .zf-plans,
        .zf-parents__grid {
          grid-template-columns: 1fr;
        }

        .zf-plan h2 {
          padding-right: 0;
          padding-top: 1.4rem;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZfAboComponent {
  readonly brand = ZF_BRAND;
  readonly plans = ZF_PLANS;
  readonly parents = ZF_PARENTS;
  readonly selected = signal<string | null>(null);
  readonly note = signal('');

  pretendSubscribe(name: string): void {
    this.selected.set(name);
    this.note.set(
      `„${name}“ ist vorgemerkt — noch kein echter Kauf. Lumi notiert dich in Moosheim auf die Liste.`,
    );
  }
}
