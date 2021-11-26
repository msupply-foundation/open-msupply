import {
  InvoiceLineNode,
  InvoiceNode,
  ItemNode,
  StockLineNode,
  LocationNode,
} from '@openmsupply-client/common/src/types/schema';

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

export type Item = Omit<ItemNode, 'availableBatches' | 'availableQuantity'>;

export type Location = LocationNode;

export interface ResolvedItem extends Item {
  __typename: 'ItemNode';
  availableBatches: { nodes: StockLine[] };
  availableQuantity: number;
}

export interface Name {
  __typename?: 'NameNode';
  id: string;
  code: string;
  name: string;
  isCustomer: boolean;
  isSupplier: boolean;
}

export interface StockLine extends Omit<StockLineNode, 'location'> {
  location: Location;
}

export interface ResolvedStockLine extends StockLine {
  __typename: 'StockLineNode';
  item: Item;
}

export interface InvoiceLine extends Omit<InvoiceLineNode, 'location'> {
  id: string;
  itemName: string;
  location?: Location;
  itemCode: string;
  itemUnit: string;
  batch?: string;
  expiryDate: string;
  stockLineId?: string;
  itemId: string;
  invoiceId: string;
  costPricePerPack: number;
  sellPricePerPack: number;
  numberOfPacks: number;
  packSize: number;
  note?: string;
}

export interface ResolvedInvoiceLine extends InvoiceLine {
  __typename: 'InvoiceLineNode';
  stockLine?: StockLine;
  item: Item;
}

export interface Invoice extends Omit<InvoiceNode, 'lines' | 'otherParty'> {
  totalAfterTax: number;
  verifiedDatetime?: string;
  pricing: {
    __typename: 'InvoicePricingNode';
    totalAfterTax: number;
    // taxPercentage: number;
    // subtotal: number;
  };
}

export interface ResolvedInvoice extends Invoice {
  __typename: 'InvoiceNode';
  lines: ListResponse<InvoiceLine>;
  otherParty: Name;
  otherPartyName: string;
}

export interface ListResponse<T> {
  totalCount: number;
  nodes: T[];
}
interface InvoiceCountsCreated {
  today: number;
  thisWeek: number;
}
export interface InvoiceCounts {
  created?: InvoiceCountsCreated;
  toBePicked?: number;
}

export interface StockCounts {
  expired: number;
  expiringSoon: number;
}

export interface ResolvedInvoiceCounts extends InvoiceCounts {
  __typename: string;
}

export interface ResolvedStockCounts extends StockCounts {
  __typename: string;
}
