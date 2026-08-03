import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ZfForestMapComponent } from '../../components/zf-forest-map.component';
import { ZfSparksComponent } from '../../components/zf-sparks.component';
import { ZfStorybookComponent } from '../../components/zf-storybook.component';
import {
  ZF_BRAND,
  ZF_CHARACTERS,
  ZF_COMIC_STORY,
  ZF_LETTER_BEATS,
  ZF_PARENTS,
  ZF_PLACES,
  ZF_RULES,
  ZF_SAMPLE_ISSUE,
} from '../../zauberfuchs.data';

@Component({
  selector: 'pv-zf-home',
  imports: [RouterLink, ZfForestMapComponent, ZfStorybookComponent, ZfSparksComponent],
  template: `
    <section class="zf-hero">
      <div class="zf-hero__bg" aria-hidden="true"></div>
      <pv-zf-forest-map />
      <div class="zf-hero__dusk" aria-hidden="true"></div>
      <div class="zf-hero__frame zf-wrap">
        <div class="zf-hero__copy">
          <p class="zf-hero__script">Das Große Buch des Zauberwaldes</p>
          <h1 class="zf-hero__brand">{{ brand.name }}</h1>
          <p class="zf-hero__lead">
            Ein gemütliches Universum zum Sammeln und Staunen — und die Zauberpost als Erinnerungsstück
            aus derselben Welt.
          </p>
          <div class="zf-hero__actions">
            <a class="zf-btn zf-btn--primary" routerLink="../briefe">In die Zauberpost schauen</a>
            <a class="zf-btn zf-btn--ghost" routerLink="../abo">Ausgabe vormerken</a>
          </div>
        </div>
      </div>
      <a class="zf-hero__scroll" href="#zf-world" (click)="scrollToWorld(); $event.preventDefault()">
        die Welt entdecken
        <i aria-hidden="true"></i>
      </a>
    </section>

    <div class="zf-below">
      <pv-zf-sparks />

    <section id="zf-world" class="zf-band zf-band--intro zf-wrap">
      <div class="zf-band__label">Band I</div>
      <h2 class="zf-band__title">Vorfreude, die man anfassen kann</h2>
      <p class="zf-band__text">
        Sammeln. Staunen. Geborgenheit. Qualität vor Quantität — jede Entscheidung muss sich nach
        Zauberfuchs anfühlen. Kein Produkt ohne Geschichte.
      </p>
      <figure class="zf-issue-card">
        <div class="zf-issue-card__meta">
          <span>{{ sample.number }}</span>
          <strong>{{ sample.subtitle }}</strong>
        </div>
        <p>{{ sample.teaser }}</p>
      </figure>
    </section>

    <div class="zf-ornament" aria-hidden="true">
      <img src="/zauberfuchs/divider-branch.webp" alt="" width="520" height="80" loading="lazy" decoding="async" />
    </div>

    <section class="zf-world">
      <div class="zf-wrap">
        <header class="zf-head">
          <p class="zf-kicker">Die Karte</p>
          <h2>Orte zum Heimkommen</h2>
          <p>Jeder lebt dort, wo seine Natur hinpasst.</p>
        </header>
        <div class="zf-places">
          @for (p of places; track p.id; let i = $index) {
            <article class="zf-place" [style.--d]="i * 40 + 'ms'">
              <span class="zf-place__n">{{ i + 1 < 10 ? '0' + (i + 1) : i + 1 }}</span>
              <h3>{{ p.name }}</h3>
              <p>{{ p.blurb }}</p>
            </article>
          }
        </div>
      </div>
    </section>

    <div class="zf-ornament zf-ornament--hat" aria-hidden="true">
      <img src="/zauberfuchs/divider-hat.webp" alt="" width="200" height="56" loading="lazy" decoding="async" />
    </div>

    <section class="zf-friends zf-wrap">
      <header class="zf-head">
        <p class="zf-kicker">Bewohner</p>
        <h2>Freunde ohne Bösewichter</h2>
        <p>Kleine Alltagsabenteuer. Magie aus Alltag, Natur und Charakter.</p>
      </header>
      <div class="zf-critters">
        @for (c of characters; track c.id) {
          <article class="zf-critter">
            <img
              class="zf-critter__portrait"
              [src]="c.portrait"
              [alt]="c.name"
              width="160"
              height="160"
              loading="lazy"
              decoding="async"
            />
            <div class="zf-critter__body">
              <h3>{{ c.name }}</h3>
              <p class="zf-critter__role">{{ c.role }} · {{ c.home }}</p>
              <p>{{ c.blurb }}</p>
            </div>
          </article>
        }
      </div>
    </section>

    <div class="zf-ornament" aria-hidden="true">
      <img src="/zauberfuchs/divider-branch.webp" alt="" width="520" height="80" loading="lazy" decoding="async" />
    </div>

    <section class="zf-comic zf-wrap">
      <header class="zf-head">
        <p class="zf-kicker">Zauberheft</p>
        <h2>{{ comic.title }}</h2>
        <p>{{ comic.subtitle }}</p>
      </header>
      <pv-zf-storybook />
    </section>

    <div class="zf-ornament zf-ornament--hat" aria-hidden="true">
      <img src="/zauberfuchs/divider-hat.webp" alt="" width="140" height="44" loading="lazy" decoding="async" />
    </div>

    <section class="zf-post">
      <div class="zf-wrap zf-post__grid">
        <div class="zf-post__visual">
          <img
            src="/zauberfuchs/zauberpost-stillleben.webp"
            width="960"
            height="720"
            alt="Geöffnete Zauberpost mit Siegel, Stickern und Sammelkarte"
            loading="lazy"
            decoding="async"
          />
          <div class="zf-post__glow" aria-hidden="true"></div>
        </div>
        <div class="zf-post__copy">
          <p class="zf-kicker">{{ brand.product }}</p>
          <h2>Was in einer Ausgabe steckt</h2>
          <p class="zf-post__lead">
            Nummerierte Ausgaben mit Untertitel — handgemacht statt Massenware.
          </p>
          <ol class="zf-beats">
            @for (b of beats; track b.title; let i = $index) {
              <li>
                <span>{{ i + 1 }}</span>
                <div>
                  <strong>{{ b.title }}</strong>
                  <p>{{ b.text }}</p>
                </div>
              </li>
            }
          </ol>
          <ul class="zf-rules">
            @for (r of rules; track r) {
              <li>{{ r }}</li>
            }
          </ul>
          <p class="zf-post__more">
            <a routerLink="../briefe">Mehr zur Zauberpost →</a>
          </p>
        </div>
      </div>
    </section>

    <div class="zf-ornament" aria-hidden="true">
      <img src="/zauberfuchs/divider-branch.webp" alt="" width="520" height="80" loading="lazy" decoding="async" />
    </div>

    <section class="zf-parents zf-wrap" id="eltern">
      <header class="zf-head">
        <p class="zf-kicker">{{ parents.kicker }}</p>
        <h2>{{ parents.title }}</h2>
        <p>{{ parents.lead }}</p>
      </header>
      <div class="zf-parents__grid">
        @for (point of parents.points; track point.title) {
          <article class="zf-parents__card">
            <h3>{{ point.title }}</h3>
            <p>{{ point.text }}</p>
          </article>
        }
      </div>
      <div class="zf-parents__cta">
        <a class="zf-btn zf-btn--primary" routerLink="../abo">Ausgaben ansehen</a>
        <a class="zf-parents__mail" [href]="'mailto:' + brand.email">Fragen an {{ brand.email }}</a>
      </div>
    </section>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .zf-below {
        position: relative;
      }

      /* Inhalt unter den Glow-Punkten; Punkte haben nur kleine Hitboxen */
      .zf-below > :not(pv-zf-sparks) {
        position: relative;
        z-index: 4;
      }

      .zf-hero {
        position: relative;
        min-height: 100svh;
        display: grid;
        align-items: center;
        justify-items: center;
        padding: 7.5rem 0 5rem;
        overflow: hidden;
        isolation: isolate;
        background: #050208;
      }

      .zf-hero__bg {
        position: absolute;
        inset: 0;
        z-index: 0;
        background: #050208;
      }

      .zf-hero__frame {
        position: relative;
        z-index: 5;
        width: 100%;
        display: flex;
        justify-content: center;
      }

      .zf-hero__copy {
        position: relative;
        z-index: 5;
        max-width: 36rem;
        text-align: center;
        animation: zf-fade-up 1.1s cubic-bezier(0.22, 1, 0.36, 1) both;
      }

      /* Weicher Nebelfleck — kein Kasten, nur Lesetiefe */
      .zf-hero__copy::before {
        content: '';
        position: absolute;
        z-index: -1;
        left: 50%;
        top: 42%;
        width: 125%;
        height: 120%;
        transform: translate(-50%, -50%);
        background: radial-gradient(
          ellipse 58% 48% at 50% 48%,
          rgba(6, 3, 14, 0.72) 0%,
          rgba(8, 4, 18, 0.42) 42%,
          rgba(8, 4, 18, 0.12) 68%,
          transparent 78%
        );
        pointer-events: none;
      }

      .zf-hero__script {
        margin: 0 0 0.55rem;
        font-family: var(--zf-script);
        font-size: clamp(2.1rem, 5vw, 3.4rem);
        color: var(--zf-moon);
        line-height: 1;
        text-shadow:
          0 1px 2px rgba(0, 0, 0, 0.55),
          0 12px 36px rgba(0, 0, 0, 0.45);
      }

      .zf-hero__brand {
        margin: 0 0 1rem;
        font-family: var(--zf-display);
        font-size: clamp(3.6rem, 11vw, 6.4rem);
        font-weight: 700;
        line-height: 0.92;
        letter-spacing: -0.03em;
        color: #fff8ff;
        text-shadow:
          0 1px 0 rgba(255, 255, 255, 0.12),
          0 2px 8px rgba(0, 0, 0, 0.45),
          0 18px 48px rgba(8, 4, 18, 0.65);
      }

      .zf-hero__lead {
        margin: 0 auto 1.75rem;
        font-size: 1.08rem;
        line-height: 1.6;
        color: rgba(250, 246, 255, 0.92);
        max-width: 30rem;
        text-wrap: pretty;
        text-shadow:
          0 1px 2px rgba(0, 0, 0, 0.75),
          0 8px 24px rgba(0, 0, 0, 0.45);
      }

      .zf-hero__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.8rem;
        justify-content: center;
      }

      .zf-hero__scroll {
        position: absolute;
        z-index: 6;
        left: 50%;
        bottom: 1.35rem;
        transform: translateX(calc(-50% - 0.11em));
        margin: 0;
        padding: 0;
        border: 0;
        background: transparent;
        box-shadow: none;
        border-radius: 0;
        color: rgba(250, 246, 255, 0.78);
        font-size: 0.78rem;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        font-weight: 700;
        line-height: 1.2;
        text-decoration: none;
        text-align: center;
        white-space: nowrap;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.55rem;
        transition: color 180ms ease, transform 180ms ease;
      }

      .zf-hero__scroll i {
        display: block;
        width: 1px;
        height: 2.35rem;
        background: linear-gradient(180deg, rgba(242, 228, 176, 0.85), transparent);
        animation: zf-drift 2.4s ease-in-out infinite;
      }

      .zf-hero__scroll:hover,
      .zf-hero__scroll:focus-visible {
        color: var(--zf-moon);
        transform: translateX(calc(-50% - 0.11em)) translateY(-2px);
        outline: none;
      }

      .zf-hero__dusk {
        position: absolute;
        inset: 0;
        z-index: 2;
        pointer-events: none;
        background:
          radial-gradient(ellipse 52% 42% at 50% 48%, rgba(6, 3, 14, 0.5), transparent 72%),
          linear-gradient(
            180deg,
            rgba(8, 4, 16, 0.28) 0%,
            transparent 26%,
            transparent 58%,
            rgba(8, 4, 16, 0.48) 100%
          );
      }

      .zf-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.95rem 1.35rem;
        border-radius: 999px;
        font-weight: 800;
        font-size: 0.95rem;
        transition: transform 220ms ease, box-shadow 220ms ease, background 220ms ease;
      }

      .zf-btn--primary {
        background: linear-gradient(135deg, #c49af0, #7a52b5 65%, #5a3a8a);
        color: white;
        box-shadow:
          0 16px 40px rgba(110, 74, 158, 0.45),
          inset 0 1px 0 rgba(255, 255, 255, 0.28);
      }

      .zf-btn--primary:hover {
        transform: translateY(-2px) scale(1.015);
      }

      .zf-btn--ghost {
        border: 1px solid rgba(242, 228, 176, 0.32);
        background: rgba(20, 12, 34, 0.35);
        backdrop-filter: blur(10px);
        color: var(--zf-bloom);
      }

      .zf-btn--ghost:hover {
        background: rgba(52, 36, 79, 0.55);
        border-color: rgba(242, 228, 176, 0.55);
      }

      .zf-band {
        position: relative;
        z-index: 1;
        padding: 4.5rem 0 1rem;
      }

      .zf-band--intro {
        max-width: 44rem;
      }

      .zf-band__label {
        display: inline-flex;
        margin-bottom: 0.85rem;
        padding: 0.3rem 0.7rem;
        border-radius: 999px;
        border: 1px solid rgba(242, 228, 176, 0.3);
        color: var(--zf-moon);
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .zf-band__title {
        margin: 0 0 0.85rem;
        font-family: var(--zf-display);
        font-size: clamp(2rem, 4.5vw, 3rem);
        line-height: 1.1;
      }

      .zf-band__text {
        margin: 0 0 1.75rem;
        color: var(--zf-muted);
        font-size: 1.08rem;
        line-height: 1.65;
      }

      .zf-issue-card {
        margin: 0;
        padding: 1.5rem 1.6rem;
        border-radius: 24px;
        background: linear-gradient(145deg, rgba(36, 24, 58, 0.94), rgba(22, 14, 40, 0.96));
        border: 1px solid rgba(242, 228, 176, 0.22);
        box-shadow: var(--zf-shadow);
        backdrop-filter: blur(10px);
      }

      .zf-issue-card__meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.65rem 1rem;
        align-items: baseline;
        margin-bottom: 0.7rem;
      }

      .zf-issue-card__meta span {
        font-family: var(--zf-display);
        font-weight: 700;
        color: var(--zf-moon);
      }

      .zf-issue-card__meta strong {
        font-size: 1.05rem;
      }

      .zf-issue-card p {
        margin: 0;
        color: var(--zf-muted);
        line-height: 1.6;
      }

      .zf-world,
      .zf-friends,
      .zf-post {
        position: relative;
        z-index: 1;
        padding: 3.5rem 0;
      }

      .zf-head {
        margin-bottom: 2rem;
        max-width: 36rem;
      }

      .zf-kicker {
        margin: 0 0 0.45rem;
        font-size: 0.75rem;
        font-weight: 800;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--zf-moon);
      }

      .zf-head h2 {
        margin: 0 0 0.55rem;
        font-family: var(--zf-display);
        font-size: clamp(1.85rem, 3.8vw, 2.6rem);
        line-height: 1.12;
      }

      .zf-head p {
        margin: 0;
        color: var(--zf-muted);
        line-height: 1.55;
      }

      .zf-places {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1rem;
      }

      .zf-place {
        position: relative;
        padding: 1.25rem 1.2rem 1.35rem;
        border-radius: 22px;
        background: linear-gradient(160deg, rgba(36, 24, 58, 0.88), rgba(18, 10, 34, 0.92));
        border: 1px solid rgba(212, 184, 240, 0.14);
        overflow: hidden;
        animation: zf-fade-up 0.9s both;
        animation-delay: var(--d, 0ms);
        transition: transform 220ms ease, border-color 220ms ease;
      }

      .zf-place::after {
        content: '';
        position: absolute;
        inset: auto -20% -40% auto;
        width: 8rem;
        height: 8rem;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(168, 121, 224, 0.22), transparent 70%);
        pointer-events: none;
      }

      .zf-place:hover {
        transform: translateY(-3px);
        border-color: rgba(242, 228, 176, 0.28);
      }

      .zf-place__n {
        display: block;
        margin-bottom: 0.55rem;
        font-family: var(--zf-display);
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--zf-lilac);
        opacity: 0.7;
      }

      .zf-place h3 {
        margin: 0 0 0.45rem;
        font-family: var(--zf-display);
        font-size: 1.25rem;
      }

      .zf-place p {
        margin: 0;
        color: var(--zf-muted);
        font-size: 0.95rem;
        line-height: 1.55;
      }

      .zf-critters {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
      }

      .zf-critter {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 1rem;
        align-items: start;
        padding: 1.15rem;
        border-radius: 22px;
        background: linear-gradient(145deg, rgba(40, 26, 64, 0.9), rgba(18, 10, 34, 0.94));
        border: 1px solid rgba(212, 184, 240, 0.14);
        transition: transform 220ms ease;
      }

      .zf-critter:hover {
        transform: translateY(-2px);
      }

      .zf-critter__portrait {
        width: 5.5rem;
        height: 5.5rem;
        border-radius: 18px;
        object-fit: cover;
        box-shadow: 0 10px 28px rgba(8, 4, 18, 0.35);
      }

      .zf-critter h3 {
        margin: 0 0 0.25rem;
        font-family: var(--zf-display);
        font-size: 1.2rem;
      }

      .zf-critter__role {
        margin: 0 0 0.55rem;
        font-size: 0.82rem;
        color: var(--zf-lilac);
      }

      .zf-critter__body > p:last-child {
        margin: 0;
        color: var(--zf-muted);
        font-size: 0.95rem;
        line-height: 1.55;
      }

      .zf-post {
        padding-bottom: 5rem;
      }

      .zf-post__grid {
        display: grid;
        grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
        gap: 2.5rem;
        align-items: center;
      }

      .zf-post__visual {
        position: relative;
      }

      .zf-post__visual img {
        display: block;
        width: 100%;
        height: auto;
        border-radius: 28px;
        box-shadow: var(--zf-shadow);
      }

      .zf-post__glow {
        position: absolute;
        inset: 10% 8%;
        z-index: -1;
        background: radial-gradient(ellipse, rgba(168, 121, 224, 0.35), transparent 70%);
        filter: blur(20px);
      }

      .zf-post__copy h2 {
        margin: 0 0 0.75rem;
        font-family: var(--zf-display);
        font-size: clamp(1.85rem, 3.5vw, 2.5rem);
      }

      .zf-post__lead {
        margin: 0 0 1.25rem;
        color: var(--zf-muted);
        line-height: 1.6;
      }

      .zf-beats {
        margin: 0 0 1.25rem;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 0.85rem;
      }

      .zf-beats li {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.85rem;
        align-items: start;
      }

      .zf-beats span {
        display: grid;
        place-items: center;
        width: 1.85rem;
        height: 1.85rem;
        border-radius: 50%;
        background: rgba(168, 121, 224, 0.22);
        color: var(--zf-moon);
        font-weight: 800;
        font-size: 0.85rem;
      }

      .zf-beats strong {
        display: block;
        margin-bottom: 0.2rem;
      }

      .zf-beats p {
        margin: 0;
        color: var(--zf-muted);
        font-size: 0.95rem;
        line-height: 1.5;
      }

      .zf-rules {
        margin: 0 0 1.5rem;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 0.45rem;
      }

      .zf-rules li {
        padding: 0.55rem 0.75rem;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(212, 184, 240, 0.1);
        font-size: 0.92rem;
        color: var(--zf-muted);
      }

      @media (max-width: 980px) {
        .zf-places {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .zf-post__grid {
          grid-template-columns: 1fr;
          gap: 1.75rem;
        }
      }

      @media (max-width: 700px) {
        .zf-critters {
          grid-template-columns: 1fr;
        }

        .zf-hero {
          min-height: 92svh;
          align-items: end;
          padding-bottom: 5.5rem;
        }

        .zf-hero__brand {
          font-size: clamp(2.8rem, 14vw, 3.8rem);
        }

        .zf-hero__lead {
          font-size: 1rem;
        }

        .zf-btn {
          width: auto;
          min-width: min(100%, 16rem);
        }

        .zf-hero__actions {
          width: 100%;
          flex-direction: column;
          align-items: stretch;
        }

        .zf-hero__actions .zf-btn {
          width: 100%;
        }
      }

      @media (min-width: 701px) and (max-width: 1099px) {
        .zf-hero__copy {
          max-width: 32rem;
        }

        .zf-places {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 520px) {
        .zf-places {
          grid-template-columns: 1fr;
        }
      }

      .zf-ornament {
        display: grid;
        place-items: center;
        padding: 1.75rem 1rem 0.5rem;
      }

      .zf-ornament img {
        width: min(420px, 72vw);
        height: auto;
        opacity: 0.9;
        filter: drop-shadow(0 10px 20px rgba(4, 2, 12, 0.5)) brightness(0.9) contrast(1.05);
      }

      .zf-ornament--hat img {
        width: min(160px, 38vw);
        opacity: 0.92;
        filter: drop-shadow(0 8px 16px rgba(4, 2, 12, 0.45)) brightness(0.92);
      }

      .zf-comic {
        padding: 2.5rem 0 1rem;
      }

      .zf-parents {
        padding: 2.5rem 0 3.5rem;
      }

      .zf-parents__grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
        margin-bottom: 1.75rem;
      }

      .zf-parents__card {
        padding: 1.35rem 1.3rem;
        border-radius: 20px;
        background: linear-gradient(165deg, rgba(28, 18, 48, 0.88), rgba(10, 6, 20, 0.92));
        border: 1px solid rgba(242, 228, 176, 0.16);
        box-shadow: inset 0 1px 0 rgba(255, 248, 236, 0.05);
      }

      .zf-parents__card h3 {
        margin: 0 0 0.45rem;
        font-family: var(--zf-display);
        font-size: 1.2rem;
        color: var(--zf-moon);
      }

      .zf-parents__card p {
        margin: 0;
        color: var(--zf-muted);
        line-height: 1.55;
        font-size: 0.96rem;
      }

      .zf-parents__cta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.85rem;
        align-items: center;
      }

      .zf-parents__mail {
        color: var(--zf-lilac);
        font-weight: 700;
        font-size: 0.95rem;
      }

      .zf-post__more {
        margin: 1.25rem 0 0;
      }

      .zf-post__more a {
        color: var(--zf-lilac);
        font-weight: 700;
      }

      @media (max-width: 720px) {
        .zf-parents__grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZfHomeComponent {
  readonly brand = ZF_BRAND;
  readonly characters = ZF_CHARACTERS;
  readonly places = ZF_PLACES;
  readonly beats = ZF_LETTER_BEATS;
  readonly rules = ZF_RULES;
  readonly sample = ZF_SAMPLE_ISSUE;
  readonly comic = ZF_COMIC_STORY;
  readonly parents = ZF_PARENTS;

  scrollToWorld(): void {
    document.getElementById('zf-world')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
