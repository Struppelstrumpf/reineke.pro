import { NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { WeisserSchaeferLabelSettingsService } from '../weisser-schaefer-label-settings.service';
import {
  splitWsLabelHeader,
  splitWsLabelPageSections,
  type WsLabelLine,
} from '../ws-label-layout';
import { labelFlexAlignment, labelPageDimensions } from '../ws-label-settings';

@Component({
  selector: 'pv-ws-label-preview',
  imports: [NgStyle],
  templateUrl: './ws-label-preview.component.html',
  styleUrls: ['./ws-label-preview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WsLabelPreviewComponent {
  readonly pages = input.required<WsLabelLine[][]>();
  readonly showMeta = input(true);

  private readonly labelSettings = inject(WeisserSchaeferLabelSettingsService);

  readonly settings = this.labelSettings.settings;
  readonly preview = this.labelSettings.preview;

  readonly pageMeta = computed(() => {
    const s = this.settings();
    const dims = labelPageDimensions(s);
    const orient = s.orientation === 'landscape' ? 'Querformat' : 'Hochformat';
    return `${dims.pageWidthMm} × ${dims.pageHeightMm} mm · ${orient} · ${s.scalePercent} %`;
  });

  readonly sheetStyle = computed(() => {
    const p = this.preview();
    const s = this.settings();
    const dims = labelPageDimensions(s);
    return {
      width: `${p.widthPx}px`,
      height: `${p.heightPx}px`,
      padding: `${s.paddingMm * p.mmToPx}px`,
      justifyContent: labelFlexAlignment(s).justifyContent,
      alignItems: labelFlexAlignment(s).alignItems,
    };
  });

  readonly innerStyle = computed(() => {
    const s = this.settings();
    const align = labelFlexAlignment(s);
    return {
      transform: `scale(${s.scalePercent / 100})`,
      transformOrigin: align.transformOrigin,
    };
  });

  readonly splitLabelSections = splitWsLabelPageSections;
  readonly splitLabelHeader = splitWsLabelHeader;
}
