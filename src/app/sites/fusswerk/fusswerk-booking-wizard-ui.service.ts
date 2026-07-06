import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FusswerkBookingWizardUiService {
  readonly open = signal(false);
  private historyPushed = false;

  show(): void {
    if (typeof history !== 'undefined' && !this.open()) {
      history.pushState({ fwBookingWizard: true }, '');
      this.historyPushed = true;
    }
    this.open.set(true);
  }

  hide(): void {
    this.open.set(false);
    if (typeof history !== 'undefined' && this.historyPushed) {
      this.historyPushed = false;
      history.back();
    }
  }

  /** Browser-Zurück: nur Wizard schließen, Seite bleibt. */
  onPopState(): void {
    if (!this.open()) return;
    this.historyPushed = false;
    this.open.set(false);
  }
}
