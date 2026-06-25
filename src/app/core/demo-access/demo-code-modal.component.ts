import {
  ChangeDetectionStrategy,
  Component,
  effect,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { resolveDemoCode, demoRoute } from './demo-access.config';
import { DemoCodeModalService } from './demo-code-modal.service';
import { DemoThemeService } from './demo-theme.service';
import type { DemoThemeId } from './demo-theme.config';

@Component({
  selector: 'pv-demo-code-modal',
  templateUrl: './demo-code-modal.component.html',
  styleUrl: './demo-code-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoCodeModalComponent {
  private readonly router = inject(Router);
  readonly modal = inject(DemoCodeModalService);
  readonly demoTheme = inject(DemoThemeService);

  readonly code = signal('');
  readonly error = signal('');
  readonly selectedTheme = signal<DemoThemeId>(this.demoTheme.activeTheme());
  readonly themeOptions = this.demoTheme.options;

  constructor() {
    effect(() => {
      this.selectedTheme.set(this.demoTheme.activeTheme());
    });
  }

  close(): void {
    this.modal.close();
    this.code.set('');
    this.error.set('');
  }

  submit(): void {
    const entry = resolveDemoCode(this.code());
    if (!entry) {
      this.error.set('Code unbekannt — bitte prüfen oder bei uns anfragen.');
      return;
    }
    this.demoTheme.setTheme(this.selectedTheme());
    this.close();
    void this.router.navigateByUrl(demoRoute(entry.slug));
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modal.visible()) {
      this.close();
    }
  }
}
