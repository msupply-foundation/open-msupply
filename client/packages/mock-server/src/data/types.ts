export interface Store {
  id: string;
  code: string;
  nameId: string;
}

export interface Item {
  id: string;
  code: string;
  name: string;
  isVisible: boolean;
}

export interface Name {
  id: string;
  code: string;
  name: string;
  isCustomer: boolean;
  isSupplier: boolean;
}

export interface ResolvedItem extends Item {
  availableBatches: { nodes: StockLine[] };
  availableQuantity: number;
}

export interface StockLine {
  id: string;
  expiryDate: string;
  batch: string;
  name: string;
  availableNumberOfPacks: number;
  totalNumberOfPacks: number;
  packSize: number;
  itemId: string;
  storeId: string;
  costPricePerPack: number;
  sellPricePerPack: number;
}

export interface ResolvedStockLine extends StockLine {
  item: Item;
}

export interface InvoiceLine {
  id: string;
  itemName: string;
  itemCode?: string;
  quantity: number;
  batchName?: string;
  expiry: string;
  stockLineId: string;
  itemId: string;
  invoiceId: string;
  costPricePerPack: number;
  sellPricePerPack: number;
  totalAfterTax: number;
  numberOfPacks: number;
  packSize: number;
}

export interface ResolvedInvoiceLine extends InvoiceLine {
  stockLine: StockLine;
  item: Item;
}

export interface Invoice {
  id: string;
  color: string;
  comment: string;
  status: string;
  type: string;
  entryDatetime: string;
  confirmedDatetime: string;
  finalisedDatetime: string | null;
  invoiceNumber: number;
  nameId: string;
  storeId: string;
  hold: boolean;
  pricing: { totalAfterTax: string };
}

export interface ResolvedInvoice extends Invoice {
  lines: InvoiceLine[];
  name: Name;
  otherPartyName: string;
}
