export type WsStockAlertItem = {
  productId: string;
  productName: string;
  spec: string;
  unit: string;
  quantity: number;
  threshold: number;
};

export type WsStockAlertPrintPayload = {
  items: WsStockAlertItem[];
};
