import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DogExploreService } from '../dog-explore.service';
import { drawDogSideView } from '../dog-mascot-canvas';

type Pt = { x: number; y: number };

type Marker = { x: number; y: number; born: number };

type Bubble = { x: number; y: number; text: string; born: number };

const BARKS = ['Wuff!', 'Wau!', 'Miau?', 'Schnüff…', 'Pfot!', 'Hier?', 'Hmm!', 'Wuff?!'];

@Component({
  selector: 'pv-dog-search-loader',
  template: `
    <div
      class="dog-loader"
      [class.dog-loader--on]="explore.loading()"
      role="status"
      aria-live="polite"
      [attr.aria-busy]="explore.loading()"
      [attr.aria-label]="explore.loading() ? 'Daten werden im Internet gesucht' : null"
    >
      <div class="dog-loader__vignette" aria-hidden="true"></div>
      <canvas #canvas class="dog-loader__canvas" aria-hidden="true"></canvas>
      @if (bubble(); as b) {
        <div
          class="dog-loader__bubble"
          [style.left.px]="b.x"
          [style.top.px]="b.y"
          aria-hidden="true"
        >
          {{ b.text }}
        </div>
      }
      <p class="dog-loader__caption" aria-hidden="true">Schnüffelt im Netz …</p>
    </div>
  `,
  styleUrl: './dog-search-loader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogSearchLoaderComponent implements AfterViewInit, OnDestroy {
  readonly explore = inject(DogExploreService);
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  readonly bubble = signal<Bubble | null>(null);

  private ctx?: CanvasRenderingContext2D;
  private raf = 0;
  private resizeObs?: ResizeObserver;
  private running = false;
  private startedAt = 0;
  private lastFrame?: number;
  private w = 0;
  private h = 0;
  private dpr = 1;

  private dog = { x: 0, y: 0, angle: 0, speed: 0 };
  private heading = 0;
  private headingTimer = 0;
  private sniffing = false;
  private sniffTimer = 0;
  private wagging = false;
  private wagTimer = 0;
  private wagPhase = 0;
  private nextBarkAt = 0;
  private trail: Pt[] = [];
  private markers: Marker[] = [];
  private reducedMotion = false;

  constructor() {
    effect(() => {
      if (this.explore.loading()) {
        queueMicrotask(() => this.start());
      } else {
        this.stop();
      }
    });
  }

  ngAfterViewInit(): void {
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas.parentElement ?? canvas);
    this.resize();
  }

  ngOnDestroy(): void {
    this.stop();
    this.resizeObs?.disconnect();
  }

  private resize(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    this.w = parent.clientWidth;
    this.h = parent.clientHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(this.w * this.dpr);
    canvas.height = Math.floor(this.h * this.dpr);
    canvas.style.width = `${this.w}px`;
    canvas.style.height = `${this.h}px`;
    this.ctx = canvas.getContext('2d') ?? undefined;
    this.ctx?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private start(): void {
    if (this.running) return;
    if (!this.canvasRef()?.nativeElement || !this.ctx) return;

    this.running = true;
    this.startedAt = performance.now();
    this.trail = [];
    this.markers = [];
    this.bubble.set(null);

    this.dog.x = this.w / 2;
    this.dog.y = this.h / 2;
    this.heading = Math.random() * Math.PI * 2;
    this.dog.angle = this.heading;
    this.dog.speed = this.reducedMotion ? 0 : 1.35 + Math.random() * 0.4;
    this.headingTimer = 0.6 + Math.random() * 0.8;
    this.sniffing = false;
    this.wagging = false;
    this.nextBarkAt = 1.2 + Math.random() * 1.4;

    const tick = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - (this.lastFrame ?? now)) / 1000);
      this.lastFrame = now;
      const elapsed = (now - this.startedAt) / 1000;
      this.step(dt, elapsed);
      this.draw(elapsed);
      this.raf = requestAnimationFrame(tick);
    };
    this.lastFrame = undefined;
    this.raf = requestAnimationFrame(tick);
  }

  private stop(): void {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.bubble.set(null);
  }

  private step(dt: number, elapsed: number): void {
    if (this.reducedMotion) {
      if (elapsed > this.nextBarkAt) {
        this.triggerBark(elapsed);
        this.nextBarkAt = elapsed + 2.2;
      }
      return;
    }

    this.headingTimer -= dt;
    if (this.headingTimer <= 0) {
      this.heading += (Math.random() - 0.5) * 1.8;
      this.headingTimer = 0.55 + Math.random() * 1.35;
      if (Math.random() < 0.35) {
        this.sniffing = true;
        this.sniffTimer = 0.35 + Math.random() * 0.45;
      }
    }

    if (this.sniffing) {
      this.sniffTimer -= dt;
      if (this.sniffTimer <= 0) this.sniffing = false;
    }

    if (this.wagging) {
      this.wagTimer -= dt;
      this.wagPhase += dt * 14;
      if (this.wagTimer <= 0) this.wagging = false;
    }

    const speedMul = this.sniffing ? 0.12 : this.wagging ? 0.45 : 1;
    const spd = this.dog.speed * 58 * dt * speedMul;

    this.dog.x += Math.cos(this.heading) * spd;
    this.dog.y += Math.sin(this.heading) * spd;

    const pad = 36;
    if (this.dog.x < pad) {
      this.dog.x = pad;
      this.heading = Math.PI - this.heading + (Math.random() - 0.5) * 0.5;
    }
    if (this.dog.x > this.w - pad) {
      this.dog.x = this.w - pad;
      this.heading = Math.PI - this.heading + (Math.random() - 0.5) * 0.5;
    }
    if (this.dog.y < pad) {
      this.dog.y = pad;
      this.heading = -this.heading + (Math.random() - 0.5) * 0.5;
    }
    if (this.dog.y > this.h - pad) {
      this.dog.y = this.h - pad;
      this.heading = -this.heading + (Math.random() - 0.5) * 0.5;
    }

    this.dog.angle += (this.heading - this.dog.angle) * Math.min(1, dt * 9);

    if (!this.sniffing && spd > 0.2) {
      this.trail.push({ x: this.dog.x, y: this.dog.y });
      if (this.trail.length > 140) this.trail.shift();
    }

    if (elapsed >= this.nextBarkAt && !this.sniffing) {
      this.triggerBark(elapsed);
      this.nextBarkAt = elapsed + 1.6 + Math.random() * 2.2;
    }

    const b = this.bubble();
    if (b && elapsed - b.born > 1.35) {
      this.bubble.set(null);
    }
  }

  private triggerBark(elapsed: number): void {
    this.wagging = true;
    this.wagTimer = 0.55 + Math.random() * 0.35;
    this.wagPhase = 0;
    this.markers.push({ x: this.dog.x, y: this.dog.y, born: elapsed });
    const text = BARKS[Math.floor(Math.random() * BARKS.length)];
    this.bubble.set({
      x: this.dog.x,
      y: Math.max(20, this.dog.y - 10),
      text,
      born: elapsed,
    });
  }

  private draw(elapsed: number): void {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, this.w, this.h);
    this.drawMapGrid(ctx);
    this.drawTrail(ctx, elapsed);
    this.drawMarkers(ctx, elapsed);
    this.drawDog(ctx, elapsed);
  }

  private drawMapGrid(ctx: CanvasRenderingContext2D): void {
    const step = 44;
    ctx.save();
    ctx.strokeStyle = 'rgba(100, 116, 80, 0.09)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.h);
      ctx.stroke();
    }
    for (let y = 0; y < this.h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.w, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawTrail(ctx: CanvasRenderingContext2D, elapsed: number): void {
    if (this.trail.length < 2) return;

    const start = this.trail[0];
    const end = this.trail[this.trail.length - 1];

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeStyle = 'rgba(124, 181, 24, 0.22)';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    for (let i = 1; i < this.trail.length; i++) ctx.lineTo(this.trail[i].x, this.trail[i].y);
    ctx.stroke();

    const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
    grad.addColorStop(0, 'rgba(106, 160, 21, 0.45)');
    grad.addColorStop(1, 'rgba(124, 181, 24, 0.98)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 4.2;
    ctx.setLineDash([11, 8]);
    ctx.lineDashOffset = -elapsed * 20;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    for (let i = 1; i < this.trail.length; i++) ctx.lineTo(this.trail[i].x, this.trail[i].y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  private drawMarkers(ctx: CanvasRenderingContext2D, elapsed: number): void {
    for (const m of this.markers) {
      const age = elapsed - m.born;
      const pop = Math.min(1, age / 0.28);
      const pulse = 1 + Math.sin(age * 5) * 0.08 * Math.max(0, 1 - age / 3);
      const r = (5 + pop * 4) * pulse;

      ctx.save();
      ctx.globalAlpha = 0.22 + pop * 0.45;
      ctx.fillStyle = '#7cb518';
      ctx.beginPath();
      ctx.arc(m.x, m.y, r + 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#6aa015';
      ctx.beginPath();
      ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(m.x - r * 0.22, m.y - r * 0.22, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawDog(ctx: CanvasRenderingContext2D, elapsed: number): void {
    const wag = this.wagging ? Math.sin(this.wagPhase) * 0.55 : Math.sin(elapsed * 3.5) * 0.06;
    drawDogSideView(ctx, this.dog.x, this.dog.y, this.dog.angle, {
      wag,
      sniffing: this.sniffing,
      elapsed,
    });
  }
}
