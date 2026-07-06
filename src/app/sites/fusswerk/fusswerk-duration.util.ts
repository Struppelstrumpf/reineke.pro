export const FW_DURATION_MIN_MINUTES = 5;
export const FW_DURATION_MAX_MINUTES = 180;
export const FW_DURATION_STEP_MINUTES = 5;

export const FW_DURATION_OPTIONS: readonly number[] = Array.from(
  { length: (FW_DURATION_MAX_MINUTES - FW_DURATION_MIN_MINUTES) / FW_DURATION_STEP_MINUTES + 1 },
  (_, i) => FW_DURATION_MIN_MINUTES + i * FW_DURATION_STEP_MINUTES,
);

export function parseDurationMinutes(raw: string, fallback = 45): number {
  const text = String(raw ?? '').toLowerCase();
  const hourMatch = text.match(/(\d+)\s*(?:h|std|stunde)/);
  const minMatch = text.match(/(\d+)\s*(?:min)/);
  if (hourMatch && minMatch) {
    const total = Number(hourMatch[1]) * 60 + Number(minMatch[1]);
    return clampDuration(total, fallback);
  }
  if (hourMatch) {
    return clampDuration(Number(hourMatch[1]) * 60, fallback);
  }
  const plain = text.match(/(\d+)/);
  if (!plain) return fallback;
  return clampDuration(Number(plain[1]), fallback);
}

export function clampDuration(minutes: number, fallback = 45): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return fallback;
  const stepped = Math.round(minutes / FW_DURATION_STEP_MINUTES) * FW_DURATION_STEP_MINUTES;
  return Math.min(FW_DURATION_MAX_MINUTES, Math.max(FW_DURATION_MIN_MINUTES, stepped));
}

export function formatDurationLabel(minutes: number): string {
  const m = clampDuration(minutes);
  if (m < 60) return `${m} Minuten`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (rest === 0) return h === 1 ? '1 Stunde' : `${h} Stunden`;
  const hLabel = h === 1 ? '1 Stunde' : `${h} Stunden`;
  return `${hLabel} ${rest} Minuten`;
}

export function formatDurationShort(minutes: number): string {
  const m = clampDuration(minutes);
  if (m < 60) return `${m} Min.`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (rest === 0) return h === 1 ? '1 Std.' : `${h} Std.`;
  return `${h} h ${rest} Min.`;
}

export function normalizeServiceDuration<T extends { duration: string; durationMinutes?: number }>(
  service: T,
  fallback = 45,
): T & { durationMinutes: number; duration: string } {
  const durationMinutes = clampDuration(service.durationMinutes ?? parseDurationMinutes(service.duration, fallback));
  return {
    ...service,
    durationMinutes,
    duration: formatDurationLabel(durationMinutes),
  };
}
