import { ObjectWithStringKeys } from './utility';

export * from './utility';

type RecordWithId = { id: string };

export interface DomainObject extends RecordWithId, ObjectWithStringKeys {}

export interface Name extends DomainObject {
  id: string;
  code: string;
  name: string;
  isCustomer: boolean;
  isSupplier: boolean;
}

export interface Item extends DomainObject {
  id: string;
  isVisible: boolean;
  code: string;
  name: string;
  availableQuantity: number;
  availableBatches: {
    nodes: StockLine[];
  };
}

export interface StockLine extends DomainObject {
  id: string;
  availableNumberOfPacks: number;
  costPricePerPack: number;
  expiryDate: string;
  batch: string;
  item: Item;
  name: string;
  packSize: number;
  sellPricePerPack: number;
  totalNumberOfPacks: number;
}

export interface InvoiceLine extends DomainObject {
  id: string;
  itemName: string;
  stockLineId: string;
  invoiceId: string;
  itemCode?: string;
  stockLine?: StockLine;
  item?: Item;
  quantity: number;
  batchName?: string;
  expiry: string;
}

export type Test = {
  id: number;
  message: string;
};

export type User = {
  id: string;
  name: string;
};

export type Store = {
  id: string;
  name: string;
};

export interface Invoice extends DomainObject {
  id: string;
  color: string;
  comment: string;
  status: string;
  type: string;
  entered: string;
  confirmed: string;
  invoiceNumber: string;
  total: string;
  name?: Name;
  otherPartyName: string;
  lines: InvoiceLine[];
}
