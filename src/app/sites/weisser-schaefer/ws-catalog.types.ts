export type { WsProductStock } from './ws-product-stock';
export { WS_PRODUCT_STOCK_OPTIONS } from './ws-product-stock';

export type WsCategory = {
  id: string;
  name: string;
  sortOrder: number;
};

export type WsProduct = {
  id: string;
  categoryId: string;
  name: string;
  spec: string;
  imageUrl?: string;
  unit: string;
  price: number;
  stock: import('./ws-product-stock').WsProductStock;
  sortOrder: number;
  active: boolean;
};

export type WsCatalogState = {
  categories: WsCategory[];
  products: WsProduct[];
};

export type WsShopCategoryGroup = {
  category: WsCategory;
  products: WsProduct[];
};

export const WS_CATALOG_KEY = 'ws-demo-catalog';
