import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';

interface SparkSpot {
  x: number;
  y: number;
}

interface SparkRuntime {
  id: number;
  /** Drei feste Positionen (Prozent) — nur in Seitenrändern */
  spots: [SparkSpot, SparkSpot, SparkSpot];
  /** Richtige Stelle (0–2), pro Reload neu gewürfelt */
  correct: 0 | 1 | 2;
}

/**
 * Drei Positionen je Punkt — ausschließlich in linken/rechten Rändern,
 * damit sie nicht über Text, Karten, Buttons oder dem Buch liegen.
 */
const ZF_SPARK_SPOTS: [SparkSpot, SparkSpot, SparkSpot][] = [
  // links — etwas vom Rand weg (nicht vom overflow abgeschnitten)
  [
    { x: 5, y: 5 },
    { x: 8, y: 12 },
    { x: 4.5, y: 19 },
  ],
  [
    { x: 7, y: 26 },
    { x: 4.5, y: 33 },
    { x: 8.5, y: 40 },
  ],
  [
    { x: 5, y: 48 },
    { x: 8, y: 56 },
    { x: 5.5, y: 64 },
  ],
  [
    { x: 8.5, y: 72 },
    { x: 5, y: 80 },
    { x: 7, y: 88 },
  ],
  [
    { x: 5.5, y: 93 },
    { x: 8, y: 97 },
    { x: 4.5, y: 90 },
  ],
  // rechts
  [
    { x: 95, y: 6 },
    { x: 92, y: 13 },
    { x: 95.5, y: 20 },
  ],
  [
    { x: 93, y: 28 },
    { x: 95.5, y: 36 },
    { x: 91.5, y: 43 },
  ],
  [
    { x: 95.5, y: 51 },
    { x: 92, y: 59 },
    { x: 94.5, y: 67 },
  ],
  [
    { x: 91.5, y: 74 },
    { x: 95, y: 82 },
    { x: 93, y: 90 },
  ],
  [
    { x: 94.5, y: 95 },
    { x: 92, y: 98 },
    { x: 95.5, y: 92 },
  ],
];

/** Gutschein, wenn alle 10 Punkte auf der richtigen Stelle stehen */
export const ZF_SPARK_VOUCHER = {
  code: 'MOOSHEIM25',
  label: '25 % Rabatt · 3 Monate',
  blurb:
    'Du hast die Glühwürmchen des Waldes versammelt. Lumi notiert den Code in Moosheim — gültig für die nächsten drei Monate (Demo).',
} as const;

function randSlot(): 0 | 1 | 2 {
  return Math.floor(Math.random() * 3) as 0 | 1 | 2;
}

function otherSlot(correct: 0 | 1 | 2): 0 | 1 | 2 {
  const offset = 1 + Math.floor(Math.random() * 2);
  return ((correct + offset) % 3) as 0 | 1 | 2;
}

function createPuzzle(): { sparks: SparkRuntime[]; slots: number[] } {
  const sparks: SparkRuntime[] = ZF_SPARK_SPOTS.map((spots, i) => ({
    id: i + 1,
    spots,
    correct: randSlot(),
  }));
  const slots = sparks.map((s) => otherSlot(s.correct));
  return { sparks, slots };
}

/** Weiße Glow-Punkte unter dem Hero — kleines Positions-Puzzle. */
@Component({
  selector: 'pv-zf-sparks',
  standalone: true,
  template: `
    <div class="zf-sparks">
      @for (s of sparks(); track s.id; let i = $index) {
        <button
          type="button"
          class="zf-spark"
          [class.zf-spark--lit]="isCorrect(i)"
          [class.zf-spark--burst]="burstId() === s.id"
          [style.left.%]="pos(i).x"
          [style.top.%]="pos(i).y"
          (click)="cycle(i, $event)"
          tabindex="-1"
          [attr.aria-label]="'Glühwürmchen ' + s.id"
        ></button>
      }
    </div>

    @if (showReward()) {
      <div class="zf-spark-modal" role="dialog" aria-modal="true" aria-labelledby="zf-spark-reward-title">
        <button type="button" class="zf-spark-modal__scrim" (click)="closeReward()" aria-label="Schließen"></button>
        <div class="zf-spark-modal__card">
          <p class="zf-spark-modal__kicker">Geheimnis gelüftet</p>
          <h2 id="zf-spark-reward-title">Ein Geschenk aus Moosheim</h2>
          <p class="zf-spark-modal__blurb">{{ voucher.blurb }}</p>
          <p class="zf-spark-modal__code">{{ voucher.code }}</p>
          <p class="zf-spark-modal__label">{{ voucher.label }}</p>
          <button type="button" class="zf-spark-modal__btn" (click)="closeReward()">Verstanden ✧</button>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        position: absolute;
        inset: 0;
        /* Über den Sektionen — sonst fangen Vollbreite-Blöcke die Klicks ab */
        z-index: 25;
        pointer-events: none;
        overflow: visible;
      }

      .zf-sparks {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }

      .zf-spark {
        position: absolute;
        width: 3rem;
        height: 3rem;
        margin: 0;
        padding: 0;
        border: 0;
        background: transparent;
        transform: translate(-50%, -50%);
        /* Nur die Punkte fangen Events — Rest der Seite bleibt normal klickbar */
        pointer-events: auto;
        cursor: pointer;
        z-index: 1;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        transition:
          left 700ms cubic-bezier(0.22, 1, 0.36, 1),
          top 700ms cubic-bezier(0.22, 1, 0.36, 1);
      }

      .zf-spark::before {
        content: '';
        position: absolute;
        left: 50%;
        top: 50%;
        width: 9px;
        height: 9px;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        background: radial-gradient(
          circle,
          rgba(255, 255, 255, 0.92) 0%,
          rgba(255, 255, 255, 0.4) 40%,
          transparent 72%
        );
        box-shadow:
          0 0 10px 3px rgba(255, 255, 255, 0.4),
          0 0 20px 7px rgba(255, 255, 255, 0.16);
        opacity: 0.55;
        transition:
          transform 240ms ease,
          opacity 240ms ease,
          box-shadow 240ms ease,
          width 240ms ease,
          height 240ms ease;
        pointer-events: none;
        animation: zf-spark-idle 5s ease-in-out infinite;
      }

      .zf-spark:hover::before {
        opacity: 0.85;
        transform: translate(-50%, -50%) scale(1.25);
      }

      .zf-spark--lit::before {
        width: 11px;
        height: 11px;
        opacity: 0.95;
        box-shadow:
          0 0 14px 5px rgba(255, 255, 255, 0.65),
          0 0 28px 10px rgba(255, 255, 255, 0.28);
        animation: none;
      }

      .zf-spark--burst::before {
        opacity: 1;
        transform: translate(-50%, -50%) scale(2.1);
        box-shadow:
          0 0 18px 8px rgba(255, 255, 255, 0.8),
          0 0 36px 14px rgba(255, 255, 255, 0.35);
        animation: none;
      }

      @keyframes zf-spark-idle {
        0%,
        100% {
          opacity: 0.42;
        }
        50% {
          opacity: 0.7;
        }
      }

      .zf-spark-modal {
        position: fixed;
        inset: 0;
        z-index: 200;
        display: grid;
        place-items: center;
        padding: 1.25rem;
        pointer-events: auto;
      }

      .zf-spark-modal__scrim {
        position: absolute;
        inset: 0;
        border: 0;
        background: rgba(6, 2, 14, 0.72);
        cursor: pointer;
      }

      .zf-spark-modal__card {
        position: relative;
        z-index: 1;
        width: min(420px, 100%);
        padding: 1.75rem 1.5rem 1.4rem;
        border-radius: 22px;
        text-align: center;
        background: linear-gradient(165deg, rgba(48, 30, 78, 0.96), rgba(16, 8, 32, 0.98));
        border: 1px solid rgba(242, 228, 176, 0.35);
        box-shadow: 0 28px 60px rgba(0, 0, 0, 0.5);
        color: #faf6ff;
      }

      .zf-spark-modal__kicker {
        margin: 0 0 0.35rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        font-size: 0.72rem;
        font-weight: 800;
        color: #f2e4b0;
      }

      .zf-spark-modal__card h2 {
        margin: 0 0 0.75rem;
        font-family: var(--zf-display);
        font-size: 1.65rem;
      }

      .zf-spark-modal__blurb {
        margin: 0 0 1.1rem;
        color: rgba(250, 246, 255, 0.78);
        line-height: 1.55;
        font-size: 0.95rem;
      }

      .zf-spark-modal__code {
        margin: 0 0 0.35rem;
        font-family: var(--zf-display);
        font-size: 1.85rem;
        letter-spacing: 0.12em;
        color: #f2e4b0;
        font-weight: 700;
      }

      .zf-spark-modal__label {
        margin: 0 0 1.25rem;
        font-weight: 700;
        color: #d4b8f0;
      }

      .zf-spark-modal__btn {
        padding: 0.75rem 1.35rem;
        border-radius: 999px;
        border: 0;
        font-weight: 800;
        background: linear-gradient(135deg, #c49af0, #7a52b5);
        color: white;
        cursor: pointer;
      }

      @media (max-width: 900px) {
        /* Auf schmalen Screens noch enger an den Rand */
        .zf-spark {
          width: 2.1rem;
          height: 2.1rem;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .zf-spark {
          transition: none;
        }
        .zf-spark::before {
          animation: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZfSparksComponent {
  readonly voucher = ZF_SPARK_VOUCHER;

  private readonly puzzle = createPuzzle();

  readonly sparks = signal<SparkRuntime[]>(this.puzzle.sparks);
  readonly slots = signal<number[]>(this.puzzle.slots);
  readonly burstId = signal<number | null>(null);
  readonly showReward = signal(false);

  private rewarded = false;
  private burstTimer: ReturnType<typeof setTimeout> | null = null;

  readonly solved = computed(() => {
    const list = this.sparks();
    return this.slots().every((slot, i) => slot === list[i].correct);
  });

  pos(i: number): SparkSpot {
    const slot = this.slots()[i] ?? 0;
    return this.sparks()[i].spots[slot as 0 | 1 | 2];
  }

  isCorrect(i: number): boolean {
    return this.slots()[i] === this.sparks()[i].correct;
  }

  cycle(i: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const id = this.sparks()[i].id;
    this.burstId.set(id);
    if (this.burstTimer) clearTimeout(this.burstTimer);
    this.burstTimer = setTimeout(() => this.burstId.set(null), 280);

    this.slots.update((list) => {
      const next = [...list];
      next[i] = (next[i] + 1) % 3;
      return next;
    });

    queueMicrotask(() => {
      if (this.solved() && !this.rewarded) {
        this.rewarded = true;
        this.showReward.set(true);
      }
    });
  }

  closeReward(): void {
    this.showReward.set(false);
  }
}
