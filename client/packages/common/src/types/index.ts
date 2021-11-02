import { ObjectWithStringKeys } from './utility';

export * from './utility';
export * from './schema';

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

export interface InvoiceLine extends DomainObject {
  id: string;

  itemId: string;
  itemName: string;
  itemCode: string;
  itemUnit: string;
  packSize: number;
  numberOfPacks: number;
  costPricePerPack: number;
  sellPricePerPack: number;

  expiryDate?: string | null;

  batch?: string | null;

  stockLine?: StockLine | null;

  location?: string;
  comment?: string;
}

export interface Invoice extends DomainObject {
  id: string;
  color: string;
  comment?: string | null;
  theirReference?: string | null;
  status: string;
  type: string;
  entryDatetime: string;
  confirmedDatetime?: string | null;
  invoiceNumber: number;
  name?: Name;
  otherPartyName: string;
  hold: boolean;
  lines: InvoiceLine[];
  draftDatetime?: string;
  allocatedDatetime?: string;
  shippedDatetime?: string;
  pickedDatetime?: string;
  deliveredDatetime?: string;
  pricing: {
    totalAfterTax: number;
  };
}

export type OutboundShipmentStatus =
  | 'DRAFT'
  | 'ALLOCATED'
  | 'PICKED'
  | 'SHIPPED'
  | 'DELIVERED';

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
