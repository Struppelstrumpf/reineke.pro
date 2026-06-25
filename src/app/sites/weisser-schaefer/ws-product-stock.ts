import type { WsProduct } from './ws-catalog.types';

export type WsProductStock = 'verfügbar' | 'Bestand' | 'auf Anfrage' | 'Ausverkauft';

export const WS_PRODUCT_STOCK_OPTIONS: ReadonlyArray<WsProductStock> = [
  'verfügbar',
  'Bestand',
  'auf Anfrage',
  'Ausverkauft',
];

export function normalizeProductStock(value: unknown): WsProductStock {
  if (value === 'verfügbar' || value === 'Bestand' || value === 'auf Anfrage' || value === 'Ausverkauft') {
    return value;
  }
  if (value === 'begrenzt') {
    return 'Bestand';
  }
  return 'verfügbar';
}

export function wsProductStockLabel(product: WsProduct, warehouseQty: number): string {
  switch (product.stock) {
    case 'verfügbar':
      return 'verfügbar';
    case 'Bestand':
      return warehouseQty > 0 ? `${warehouseQty}× ${product.unit} auf Lager` : 'nicht auf Lager';
    case 'auf Anfrage':
      return 'auf Anfrage';
    case 'Ausverkauft':
      return 'Ausverkauft';
  }
}

export function wsProductCanOrder(product: WsProduct, warehouseQty: number): boolean {
  switch (product.stock) {
    case 'verfügbar':
    case 'auf Anfrage':
      return true;
    case 'Bestand':
      return warehouseQty > 0;
    case 'Ausverkauft':
      return false;
  }
}

export function wsProductMaxOrderQty(
  product: WsProduct,
  warehouseQty: number,
  alreadyInCart: number,
): number | null {
  if (!wsProductCanOrder(product, warehouseQty)) {
    return 0;
  }
  if (product.stock === 'Bestand') {
    return Math.max(0, warehouseQty - alreadyInCart);
  }
  return null;
}

export function wsProductStockBadgeClass(stock: WsProductStock): string {
  switch (stock) {
    case 'verfügbar':
      return 'is-available';
    case 'Bestand':
      return 'is-warehouse';
    case 'auf Anfrage':
      return 'is-request';
    case 'Ausverkauft':
      return 'is-soldout';
  }
}

export function wsProductIsOrderableForFilter(
  product: WsProduct,
  warehouseQty: number,
): boolean {
  return wsProductCanOrder(product, warehouseQty);
}
