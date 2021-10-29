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
  unit: string;
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
  location: string;
  onHold: boolean;
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
  itemUnit?: string;
  location?: string;
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
  theirReference: string;
  status: string;
  type: string;
  entryDatetime: string;
  confirmedDatetime: string;
  invoiceNumber: string;
  total: string;
  name?: Name;
  otherPartyName: string;
  hold: boolean;
  lines: InvoiceLine[];
  pricing: {
    totalAfterTax: number;
  };
}

export type OutboundShipmentStatus =
  | 'draft'
  | 'allocated'
  | 'picked'
  | 'shipped'
  | 'delivered';

export type InboundShipmentStatus =
  | 'new'
  | 'allocated'
  | 'picked'
  | 'shipped'
  | 'delivered';

export type SupplierRequisitionStatus =
  | 'draft'
  | 'sent'
  | 'in_progress'
  | 'finalised';

export type CustomerRequisitionStatus = 'new' | 'in_progress' | 'finalised';
