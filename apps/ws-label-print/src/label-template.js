const {
  normalizeLabelSettings,
  labelPageDimensions,
  labelFlexAlignment,
} = require('./label-settings');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function labelStyles(settingsInput) {
  const settings = normalizeLabelSettings(settingsInput);
  const { pageWidthMm, pageHeightMm } = labelPageDimensions(settings);
  const { justifyContent, alignItems, transformOrigin } = labelFlexAlignment(settings);
  const innerW = pageWidthMm - settings.paddingMm * 2;
  const scale = settings.scalePercent / 100;

  return `
    @page { size: ${pageWidthMm}mm ${pageHeightMm}mm; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      width: ${pageWidthMm}mm;
      height: ${pageHeightMm}mm;
      margin: 0;
      padding: 0;
      background: #fff;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 3.6mm;
      line-height: 1.22;
      color: #111;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .label-page {
      width: ${pageWidthMm}mm;
      height: ${pageHeightMm}mm;
      padding: ${settings.paddingMm}mm;
      display: flex;
      justify-content: ${justifyContent};
      align-items: ${alignItems};
      overflow: hidden;
    }
    .label-inner {
      width: 100%;
      max-width: ${innerW}mm;
      transform: scale(${scale});
      transform-origin: ${transformOrigin};
      display: flex;
      flex-direction: column;
      gap: 1.2mm;
      min-height: 0;
    }
    .label-top {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 3mm;
      align-items: start;
    }
    .label-order { min-width: 0; }
    .label-brand {
      width: ${Math.round(innerW * 0.34)}mm;
      text-align: center;
      flex-shrink: 0;
    }
    .label-items {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      gap: 0.55mm;
      min-height: 0;
      padding-top: 0.5mm;
    }
    .label-footer {
      flex: 0 0 auto;
      margin-top: auto;
      padding-top: 0.8mm;
    }
    .ws-logo {
      display: block;
      width: 100%;
      max-height: 17mm;
      height: auto;
      object-fit: contain;
      margin: 0 auto 0.5mm;
    }
    .ws-meta { font-size: 3.2mm; color: #444; }
    .ws-meta--center { text-align: center; }
    .ws-subtitle { font-size: 5mm; font-weight: 700; margin: 0 0 0.6mm; }
    .ws-body { font-size: 4.4mm; font-weight: 700; margin: 0 0 0.35mm; }
    .ws-items-title { font-size: 3.1mm; font-weight: 700; letter-spacing: 0.08mm; text-transform: uppercase; }
    .ws-item { font-size: 3.35mm; font-weight: 400; }
    .ws-spacer { min-height: 1.8mm; display: block; }
    .ws-note { font-size: 3.5mm; color: #333; margin-top: 0.5mm; }
    .ws-contact { font-size: 3.1mm; line-height: 1.28; color: #222; }
    .ws-divider { border: 0; border-top: 0.25mm solid #999; margin: 0.8mm 0; }
    .ws-page { font-size: 3mm; font-weight: 700; text-align: center; margin-top: 0.4mm; }
    .ws-barcode {
      font-family: Consolas, 'Courier New', monospace;
      font-size: 3.2mm;
      text-align: center;
      margin-top: 0.5mm;
      letter-spacing: 0.12mm;
    }
  `;
}

function splitPageSections(lines) {
  const header = [];
  const items = [];
  const footer = [];
  let phase = 'header';

  for (const line of lines) {
    if (line.style === 'itemHeading' || line.style === 'item') {
      phase = 'items';
    } else if (line.style === 'divider' || line.style === 'contact' || line.style === 'barcode' || line.style === 'page') {
      phase = 'footer';
    }

    if (phase === 'header') {
      header.push(line);
    } else if (phase === 'items') {
      items.push(line);
    } else {
      footer.push(line);
    }
  }

  return { header, items, footer };
}

function renderHeaderHtml(header, logoSrc) {
  const brand = [];
  const order = [];

  for (const line of header) {
    if (line.style === 'logo' || (line.style === 'meta' && !order.length)) {
      brand.push(line);
    } else {
      order.push(line);
    }
  }

  const brandHtml = brand
    .map((line) => {
      if (line.style === 'logo') {
        return logoSrc ? `<img class="ws-logo" src="${logoSrc}" alt="Weißer Schäfer" />` : '';
      }
      return `<div class="ws-meta ws-meta--center">${escapeHtml(line.text)}</div>`;
    })
    .join('');

  const orderHtml = order
    .map((line) => {
      const cls =
        line.style === 'subtitle'
          ? 'ws-subtitle'
          : line.style === 'body'
            ? 'ws-body'
            : line.style === 'spacer'
              ? 'ws-spacer'
              : 'ws-meta';
      return `<div class="${cls}">${escapeHtml(line.text)}</div>`;
    })
    .join('');

  return `<div class="label-top"><div class="label-order">${orderHtml}</div><div class="label-brand">${brandHtml}</div></div>`;
}

function renderItemsHtml(items) {
  return items
    .map((line) => {
      if (line.style === 'itemHeading') {
        return `<div class="ws-items-title">${escapeHtml(line.text)}</div>`;
      }
      if (line.style === 'meta' && line.text.startsWith('Hinweis:')) {
        return `<div class="ws-note">${escapeHtml(line.text)}</div>`;
      }
      if (line.style === 'meta') {
        return `<div class="ws-meta">${escapeHtml(line.text)}</div>`;
      }
      return `<div class="ws-item">${escapeHtml(line.text)}</div>`;
    })
    .join('');
}

function renderFooterHtml(footer) {
  return footer
    .map((line) => {
      switch (line.style) {
        case 'divider':
          return '<hr class="ws-divider" />';
        case 'contact':
          return `<div class="ws-contact">${escapeHtml(line.text)}</div>`;
        case 'page':
          return `<div class="ws-page">${escapeHtml(line.text)}</div>`;
        case 'barcode':
          return `<div class="ws-barcode">${escapeHtml(line.text)}</div>`;
        default:
          return `<div class="ws-meta">${escapeHtml(line.text)}</div>`;
      }
    })
    .join('');
}

function renderSinglePageHtml(page, logoSrc, settingsInput) {
  const { header, items, footer } = splitPageSections(page.lines);

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Etikett</title>
  <style>${labelStyles(settingsInput)}</style>
</head>
<body>
  <section class="label-page">
    <div class="label-inner">
      ${renderHeaderHtml(header, logoSrc)}
      <div class="label-items">${renderItemsHtml(items)}</div>
      <div class="label-footer">${renderFooterHtml(footer)}</div>
    </div>
  </section>
</body>
</html>`;
}

module.exports = {
  renderSinglePageHtml,
  labelStyles,
};
