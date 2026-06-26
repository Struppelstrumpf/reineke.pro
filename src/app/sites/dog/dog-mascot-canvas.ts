/** Seitenansicht-Hund — gleicher Stil wie Loader, Marker & Logo. */
export function drawDogSideView(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  opts: { wag: number; sniffing: boolean; elapsed: number; scale?: number },
): void {
  const scale = opts.scale ?? 1;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = '#e8dcc8';
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#d4c4a8';
  ctx.beginPath();
  ctx.ellipse(-1, 0.5, 8.5, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e8dcc8';
  ctx.beginPath();
  ctx.arc(11, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#c8b898';
  ctx.beginPath();
  ctx.ellipse(9.5, -4.5, 2.2, 3, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(9.5, 4.5, 2.2, 3, 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1c2214';
  ctx.beginPath();
  ctx.arc(13.5, -0.3, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(13.8, -0.7, 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (opts.sniffing) {
    ctx.strokeStyle = 'rgba(124, 181, 24, 0.55)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      const a = -0.35 + i * 0.35 + Math.sin(opts.elapsed * 12 + i) * 0.08;
      ctx.beginPath();
      ctx.arc(15, 0, 4 + i * 2.2, a - 0.25, a + 0.25);
      ctx.stroke();
    }
  }

  ctx.save();
  ctx.translate(-10, 0);
  ctx.rotate(opts.wag);
  ctx.fillStyle = '#c8b898';
  ctx.beginPath();
  ctx.ellipse(-4.5, 0, 5, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}
