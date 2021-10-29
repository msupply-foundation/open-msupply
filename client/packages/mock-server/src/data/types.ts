export interface ListResponse<T> {
  __typename: string;
  totalCount: number;
  nodes: T[];
}

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
  unit: string;
}

export interface Name {
  id: string;
  code: string;
  name: string;
  isCustomer: boolean;
  isSupplier: boolean;
}

export interface ResolvedItem extends Item {
  __typename: string;
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
  location: string;
}

export interface ResolvedStockLine extends StockLine {
  __typename: string;
  item: Item;
}

export interface InvoiceLine {
  id: string;
  itemName: string;
  itemCode?: string;
  itemUnit?: string;
  quantity: number;
  batchName?: string;
  expiryDate: string;
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
  __typename: string;
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
  otherPartyId: string;
  storeId: string;
  hold: boolean;

  draftDatetime?: string;
  allocatedDatetime?: string;
  pickedDatetime?: string;
  shippedDatetime?: string;
  deliveredDatetime?: string;

  pricing: { __typename: string; totalAfterTax: string };
}

export interface ResolvedInvoice extends Invoice {
  __typename: string;
  lines: ListResponse<InvoiceLine>;
  name: Name;
  otherPartyName: string;
}

export interface PaginationOptions {
  first: number;
  offset: number;
  sort?: string;
  desc: boolean;
}

export interface ListResponse<T> {
  totalCount: number;
  nodes: T[];
}
