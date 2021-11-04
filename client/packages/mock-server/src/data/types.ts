import {
  InvoiceLineNode,
  InvoiceNode,
  StockLineNode,
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

export interface Item {
  id: string;
  code: string;
  name: string;
  isVisible: boolean;
  unit: string;
  onHold: boolean;
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

export type StockLine = StockLineNode;

export interface ResolvedStockLine extends StockLine {
  __typename: 'StockLineNode';
  item: Item;
}

export interface InvoiceLine extends InvoiceLineNode {
  id: string;
  itemName: string;
  itemCode: string;
  itemUnit: string;
  quantity: number;
  batch?: string;
  expiryDate: string;
  stockLineId: string;
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
  stockLine: StockLine;
  item: Item;
}

export interface Invoice extends Omit<InvoiceNode, 'lines'> {
  pricing: {
    __typename: 'InvoicePricingNode';
    totalAfterTax: number;
    taxPercentage: number;
    subtotal: number;
  };
}

export interface ResolvedInvoice extends Invoice {
  __typename: 'InvoiceNode';
  lines: ListResponse<InvoiceLine>;
  name: Name;
  otherPartyName: string;
}

export interface ListResponse<T> {
  totalCount: number;
  nodes: T[];
}
