import { Injectable } from '@angular/core';

/** In-page scroll without changing the URL (no hash fragments). */
@Injectable({ providedIn: 'root' })
export class ScrollSectionService {
  scrollToId(id: string, delayMs = 0): void {
    const run = (): void => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if (delayMs > 0) {
      window.setTimeout(run, delayMs);
    } else {
      window.requestAnimationFrame(run);
    }
  }
}
