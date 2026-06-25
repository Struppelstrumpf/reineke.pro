const DEFAULT_LABEL_SETTINGS = {
  widthMm: 100,
  heightMm: 150,
  orientation: 'portrait',
  scalePercent: 88,
  alignH: 'center',
  alignV: 'center',
  paddingMm: 4,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeLabelSettings(raw) {
  const base = { ...DEFAULT_LABEL_SETTINGS, ...(raw || {}) };
  return {
    widthMm: clamp(Math.round(Number(base.widthMm) || DEFAULT_LABEL_SETTINGS.widthMm), 40, 220),
    heightMm: clamp(Math.round(Number(base.heightMm) || DEFAULT_LABEL_SETTINGS.heightMm), 30, 300),
    orientation: base.orientation === 'landscape' ? 'landscape' : 'portrait',
    scalePercent: clamp(Math.round(Number(base.scalePercent) || DEFAULT_LABEL_SETTINGS.scalePercent), 40, 100),
    alignH: base.alignH === 'left' || base.alignH === 'right' ? base.alignH : 'center',
    alignV: base.alignV === 'top' || base.alignV === 'bottom' ? base.alignV : 'center',
    paddingMm: clamp(Number(Number(base.paddingMm).toFixed(1)) || DEFAULT_LABEL_SETTINGS.paddingMm, 0, 20),
  };
}

function labelPageDimensions(settings) {
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

function labelFlexAlignment(settings) {
  const justifyContent =
    settings.alignH === 'left' ? 'flex-start' : settings.alignH === 'right' ? 'flex-end' : 'center';
  const alignItems =
    settings.alignV === 'top' ? 'flex-start' : settings.alignV === 'bottom' ? 'flex-end' : 'center';
  return {
    justifyContent,
    alignItems,
    transformOrigin: `${settings.alignH} ${settings.alignV}`,
  };
}

module.exports = {
  DEFAULT_LABEL_SETTINGS,
  normalizeLabelSettings,
  labelPageDimensions,
  labelFlexAlignment,
};
