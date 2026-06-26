import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DogMascotComponent } from './dog-mascot.component';
import { DogPetLauncherService } from '../dog-pet-launcher.service';
import { DogPetMapGameService } from '../dog-pet-map-game.service';
import { DOG_ACTION_META } from '../dog-pet-stats';
import { DogMobileService } from '../dog-mobile.service';
import { DogPetService } from '../dog-pet.service';
import type { DogPetAction } from '../dog-pet.types';

@Component({
  selector: 'pv-dog-pet-widget',
  imports: [DogMascotComponent],
  template: `
    @if ((launcher.expanded() || launcher.animating()) && !mapGame.playing()) {
      <div
        class="dog-pet"
        [class.dog-pet--mobile]="mobile.isMobile()"
        [class.dog-pet--open]="launcher.expanded()"
        [class.dog-pet--closing]="launcher.animating() && !launcher.expanded()"
        [style.--pet-from-x.px]="fromX()"
        [style.--pet-from-y.px]="fromY()"
        [style.--pet-from-size.px]="fromSize()"
        [style.--pet-to-x.px]="toTarget().cx"
        [style.--pet-to-y.px]="toTarget().cy"
        [style.--pet-to-w.px]="cardW()"
        [style.--pet-to-h.px]="cardH()"
        [style.--pet-mid-x.px]="midX()"
        [style.--pet-mid-y.px]="midY()"
      >
        <div
          #dock
          class="dog-pet__dock"
          [style.left.px]="pos().x"
          [style.top.px]="pos().y"
          [style.width.px]="cardW()"
          [style.height.px]="cardH()"
          (pointerdown)="onDragStart($event)"
        >
          <div class="dog-pet__card">
            <button
              type="button"
              class="dog-pet__close"
              aria-label="Nasebär einklappen"
              (click)="close($event)"
              (pointerdown)="$event.stopPropagation()"
            >
              ×
            </button>

            <div class="dog-pet__hero">
              <div class="dog-pet__mascot-wrap" [style.--xp-pct]="pet.xpProgress() + '%'">
                <div class="dog-pet__xp-ring" aria-hidden="true"></div>
                <pv-dog-mascot
                  variant="logo"
                  [size]="mascotSize()"
                  [animated]="true"
                  [petDriven]="true"
                  [compactBubble]="true"
                />
                <span class="dog-pet__lvl">Lvl {{ pet.state().level }}</span>
              </div>
              <div class="dog-pet__identity">
                <p class="dog-pet__name">{{ pet.state().name }}</p>
                <p class="dog-pet__mood">{{ pet.moodLabel() }}</p>
                <p class="dog-pet__xp-line">
                  <span>⭐ {{ pet.xpInLevel() }}/40 XP</span>
                  <span class="dog-pet__xp-next">→ Lvl {{ pet.state().level + 1 }}</span>
                </p>
              </div>
            </div>

            @if (pet.careAdvice(); as advice) {
              <div class="dog-pet__care">
                <span class="dog-pet__care-ico">{{ advice.icon }}</span>
                <span>{{ advice.statLabel }} niedrig ({{ advice.value }}) — {{ advice.label }} empfohlen</span>
              </div>
            }

            <div class="dog-pet__main">
              <div class="dog-pet__playzone">
                <p class="dog-pet__play-intro">Mini-Spiele auf der Karte — wähle eine Pflege:</p>
                <div class="dog-pet__tiles" role="group" aria-label="Karten-Mini-Spiele">
                  @for (tile of gameTiles(); track tile.id) {
                    <button
                      type="button"
                      class="dog-pet__tile"
                      [class.dog-pet__tile--urgent]="tile.urgent"
                      (click)="startMapGame(tile.id, $event)"
                      (pointerdown)="$event.stopPropagation()"
                    >
                      @if (tile.urgent) {
                        <span class="dog-pet__tile-badge">!</span>
                      }
                      <span class="dog-pet__tile-ico" aria-hidden="true">{{ tile.icon }}</span>
                      <span class="dog-pet__tile-label">{{ tile.label }}</span>
                      <span class="dog-pet__tile-sub">{{ tile.sub }}</span>
                      <span class="dog-pet__tile-boost">{{ tile.boosts }}</span>
                    </button>
                  }
                </div>
              </div>
            </div>

            <div class="dog-pet__status" aria-label="Pflege-Status">
              @if (pet.lastReward(); as reward) {
                <div class="dog-pet__reward" role="status">
                  <div class="dog-pet__reward-row">
                    <span class="dog-pet__reward-title">
                      @if (reward.leveledUp) {
                        Level {{ reward.newLevel }}! 🎉
                      } @else if (reward.score >= 50) {
                        Gut gemacht!
                      } @else {
                        Fast geschafft
                      }
                    </span>
                    <button type="button" class="dog-pet__reward-dismiss" (click)="dismissReward($event)">
                      ×
                    </button>
                  </div>
                  <span class="dog-pet__reward-deltas">
                    @for (d of reward.deltas; track d.key) {
                      <span class="dog-pet__reward-chip">
                        {{ d.icon }} {{ d.value > 0 ? '+' : '' }}{{ d.value }}
                      </span>
                    }
                    <span class="dog-pet__reward-chip dog-pet__reward-chip--score">{{ reward.score }}%</span>
                  </span>
                </div>
              }
              <div class="dog-pet__regen">
                <span class="dog-pet__regen-dot"></span>
                <span>Pflege-Werte sinken in {{ pet.tickInSeconds() }}s</span>
              </div>
              <div class="dog-pet__bars">
                @for (bar of pet.statRows(); track bar.key) {
                  <div class="dog-pet__bar-row" [attr.data-band]="bar.band">
                    <span class="dog-pet__bar-label">
                      <span class="dog-pet__bar-ico" aria-hidden="true">{{ bar.icon }}</span>
                      {{ bar.label }}
                    </span>
                    <div class="dog-pet__bar-track">
                      <div class="dog-pet__bar-fill" [style.width.%]="bar.value"></div>
                    </div>
                    <span class="dog-pet__bar-val">{{ bar.value }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './dog-pet-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogPetWidgetComponent {
  readonly launcher = inject(DogPetLauncherService);
  readonly pet = inject(DogPetService);
  readonly mapGame = inject(DogPetMapGameService);
  readonly mobile = inject(DogMobileService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dockRef = viewChild<ElementRef<HTMLElement>>('dock');

  readonly cardW = computed(() => this.launcher.dock().width);
  readonly cardH = computed(() => this.launcher.dock().height);
  readonly mascotSize = computed(() => Math.round(Math.min(76, this.cardW() * 0.2)));

  readonly gameTiles = computed(() => {
    const rows = this.pet.statRows();
    const byAction = new Map(rows.map((r) => [r.action, r]));
    return (['feed', 'play', 'shower', 'sleep'] as DogPetAction[]).map((id) => {
      const meta = DOG_ACTION_META[id];
      const stat = byAction.get(id);
      return {
        id,
        label: meta.label,
        sub: meta.shortHint,
        icon: meta.icon,
        boosts: meta.boosts.join(' · '),
        urgent: stat ? stat.value < 45 : false,
      };
    });
  });

  readonly pos = signal({ x: 0, y: 0 });

  readonly fromX = computed(() => {
    const r = this.launcher.originRect();
    return r ? r.left + r.width / 2 : window.innerWidth / 2;
  });
  readonly fromY = computed(() => {
    const r = this.launcher.originRect();
    return r ? r.top + r.height / 2 : 40;
  });
  readonly fromSize = computed(() => this.launcher.originRect()?.width ?? 56);
  readonly toTarget = computed(() => this.pet.mapCenterTarget());
  readonly midX = computed(() => {
    const from = this.fromX();
    const to = this.toTarget().cx;
    return from + (to - from) * 0.48;
  });
  readonly midY = computed(() => {
    const from = this.fromY();
    const to = this.toTarget().cy;
    const travel = Math.max(0, to - from);
    const floor = from + Math.min(64, travel * 0.1);
    const arc = from + travel * 0.36;
    return Math.max(floor, arc);
  });

  private dragging = false;
  private dragOff = { x: 0, y: 0 };

  constructor() {
    const syncSize = () => {
      const dims = this.pet.cardDimensions();
      this.launcher.dock.update((d) => ({ ...d, width: dims.width, height: dims.height }));
    };

    const onResize = () => {
      syncSize();
      if (this.launcher.expanded()) {
        const t = this.pet.mapCenterTarget();
        this.pos.set({ x: t.x, y: t.y });
      }
    };

    syncSize();

    effect(() => {
      if (!this.launcher.expanded()) {
        untracked(() => this.mapGame.cancel());
        return;
      }
      untracked(() => {
        syncSize();
        const t = this.pet.mapCenterTarget();
        this.pos.set({ x: t.x, y: t.y });
      });
    });

    window.addEventListener('resize', onResize);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', onResize);
      this.mapGame.cancel();
    });

    effect(() => {
      const reward = this.pet.lastReward();
      if (!reward) return;
      const timer = window.setTimeout(() => this.pet.clearLastReward(), 6000);
      return () => window.clearTimeout(timer);
    });
  }

  close(event: Event): void {
    event.stopPropagation();
    this.mapGame.cancel();
    this.launcher.collapse();
  }

  dismissReward(event: Event): void {
    event.stopPropagation();
    this.pet.clearLastReward();
  }

  startMapGame(action: DogPetAction, event: Event): void {
    event.stopPropagation();
    this.pet.clearLastReward();
    this.mapGame.start(action);
  }

  onDragStart(event: PointerEvent): void {
    if ((event.target as HTMLElement).closest('button')) return;
    const dock = this.dockRef()?.nativeElement;
    if (!dock) return;
    this.dragging = true;
    const rect = dock.getBoundingClientRect();
    this.dragOff = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    dock.setPointerCapture(event.pointerId);
    dock.onpointermove = (e) => this.onDragMove(e);
    dock.onpointerup = (e) => this.onDragEnd(e);
    dock.onpointercancel = (e) => this.onDragEnd(e);
  }

  private onDragMove(event: PointerEvent): void {
    if (!this.dragging) return;
    const w = this.cardW();
    const h = this.cardH();
    const maxX = window.innerWidth - w - 8;
    const maxY = window.innerHeight - h - 8;
    const x = Math.min(maxX, Math.max(8, event.clientX - this.dragOff.x));
    const y = Math.min(maxY, Math.max(8, event.clientY - this.dragOff.y));
    this.pos.set({ x, y });
  }

  private onDragEnd(event: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    const dock = this.dockRef()?.nativeElement;
    dock?.releasePointerCapture(event.pointerId);
    if (dock) {
      dock.onpointermove = null;
      dock.onpointerup = null;
      dock.onpointercancel = null;
    }
    const p = this.pos();
    this.pet.setDock(p.x, p.y);
  }
}
