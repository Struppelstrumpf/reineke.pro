import { isZauberfuchsHost } from '../../core/site-host';

/** Absolute Link-Pfade für Host-Domain und /demo/zauberfuchs. */
export function zfLink(...segments: string[]): string {
  const base = isZauberfuchsHost() ? '' : '/demo/zauberfuchs';
  const path = segments.filter(Boolean).join('/');
  if (!base && !path) return '/';
  return `${base}/${path}`.replace(/\/{2,}/g, '/');
}
