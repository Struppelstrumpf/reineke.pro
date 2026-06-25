import { Injectable, computed, inject, signal } from '@angular/core';
import {
  WS_LABEL_SETTINGS_DEFAULT,
  labelPreviewPx,
  loadWsLabelSettings,
  normalizeWsLabelSettings,
  saveWsLabelSettings,
  type WsLabelPrintSettings,
} from './ws-label-settings';
import { WeisserSchaeferPrintService } from './weisser-schaefer-print.service';

@Injectable({ providedIn: 'root' })
export class WeisserSchaeferLabelSettingsService {
  private readonly print = inject(WeisserSchaeferPrintService);

  readonly settings = signal<WsLabelPrintSettings>(loadWsLabelSettings());
  readonly syncing = signal(false);
  readonly lastSavedAt = signal<string | null>(null);

  readonly preview = computed(() => labelPreviewPx(this.settings(), 400));

  constructor() {
    this.print.onOnline(() => {
      void this.persist();
    });
  }

  update(partial: Partial<WsLabelPrintSettings>): void {
    this.settings.set(normalizeWsLabelSettings({ ...this.settings(), ...partial }));
  }

  reset(): void {
    this.settings.set({ ...WS_LABEL_SETTINGS_DEFAULT });
    void this.persist();
  }

  async persist(): Promise<void> {
    const next = normalizeWsLabelSettings(this.settings());
    this.settings.set(next);
    saveWsLabelSettings(next);
    this.syncing.set(true);
    try {
      if (this.print.connected()) {
        await this.print.saveLabelSettings(next);
      }
      this.lastSavedAt.set(new Date().toISOString());
    } finally {
      this.syncing.set(false);
    }
  }

  async syncFromApp(): Promise<void> {
    const remote = await this.print.fetchLabelSettings();
    if (remote) {
      this.settings.set(normalizeWsLabelSettings(remote));
      saveWsLabelSettings(this.settings());
    }
  }
}
