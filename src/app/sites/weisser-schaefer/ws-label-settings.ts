export type WsLabelOrientation = 'portrait' | 'landscape';
export type WsLabelAlignH = 'left' | 'center' | 'right';
export type WsLabelAlignV = 'top' | 'center' | 'bottom';

export type WsLabelPrintSettings = {
  widthMm: number;
  heightMm: number;
  orientation: WsLabelOrientation;
  scalePercent: number;
  alignH: WsLabelAlignH;
  alignV: WsLabelAlignV;
  paddingMm: number;
};

export const WS_LABEL_SETTINGS_KEY = 'ws-label-print-settings';

export const WS_LABEL_SETTINGS_DEFAULT: WsLabelPrintSettings = {
  widthMm: 100,
  heightMm: 150,
  orientation: 'portrait',
  scalePercent: 88,
  alignH: 'center',
  alignV: 'center',
  paddingMm: 4,
};

export function normalizeWsLabelSettings(
  raw: Partial<WsLabelPrintSettings> | null | undefined,
): WsLabelPrintSettings {
  const base = { ...WS_LABEL_SETTINGS_DEFAULT, ...raw };
  return {
    widthMm: clamp(Math.round(base.widthMm), 40, 220),
    heightMm: clamp(Math.round(base.heightMm), 30, 300),
    orientation: base.orientation === 'landscape' ? 'landscape' : 'portrait',
    scalePercent: clamp(Math.round(base.scalePercent), 40, 100),
    alignH: base.alignH === 'left' || base.alignH === 'right' ? base.alignH : 'center',
    alignV: base.alignV === 'top' || base.alignV === 'bottom' ? base.alignV : 'center',
    paddingMm: clamp(Number(base.paddingMm.toFixed(1)), 0, 20),
  };
}

export function loadWsLabelSettings(): WsLabelPrintSettings {
  try {
    const raw = localStorage.getItem(WS_LABEL_SETTINGS_KEY);
    if (!raw) {
      return { ...WS_LABEL_SETTINGS_DEFAULT };
    }
    return normalizeWsLabelSettings(JSON.parse(raw) as Partial<WsLabelPrintSettings>);
  } catch {
    return { ...WS_LABEL_SETTINGS_DEFAULT };
  }
}

export function saveWsLabelSettings(settings: WsLabelPrintSettings): void {
  localStorage.setItem(WS_LABEL_SETTINGS_KEY, JSON.stringify(settings));
}

export function labelPageDimensions(settings: WsLabelPrintSettings): {
  pageWidthMm: number;
  pageHeightMm: number;
  landscape: boolean;
} {
  if (settings.orientation === 'landscape') {
    return {
      pageWidthMm: Math.max(settings.widthMm, settings.heightMm),
      pageHeightMm: Math.min(settings.widthMm, settings.heightMm),
      landscape: true,
    };
  }
  return {
    pageWidthMm: settings.widthMm,
    pageHeightMm: settings.heightMm,
    landscape: false,
  };
}

export function labelFlexAlignment(settings: WsLabelPrintSettings): {
  justifyContent: string;
  alignItems: string;
  transformOrigin: string;
} {
  const justifyContent =
    settings.alignH === 'left' ? 'flex-start' : settings.alignH === 'right' ? 'flex-end' : 'center';
  const alignItems =
    settings.alignV === 'top' ? 'flex-start' : settings.alignV === 'bottom' ? 'flex-end' : 'center';
  const transformOrigin = `${settings.alignH} ${settings.alignV}`;
  return { justifyContent, alignItems, transformOrigin };
}

export function labelPreviewPx(settings: WsLabelPrintSettings, maxWidthPx = 420): {
  widthPx: number;
  heightPx: number;
  mmToPx: number;
} {
  const { pageWidthMm, pageHeightMm } = labelPageDimensions(settings);
  const mmToPx = maxWidthPx / pageWidthMm;
  return {
    widthPx: Math.round(pageWidthMm * mmToPx),
    heightPx: Math.round(pageHeightMm * mmToPx),
    mmToPx,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
