import { ObjectWithStringKeys } from './utility';
import {
  InvoiceLineNode,
  InvoiceNode,
  StockLineNode,
  InvoicePricingNode,
} from './schema';

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

export interface ItemRow extends DomainObject {
  id: string;
  isVisible: boolean;
  code: string;
  name: string;
  availableQuantity: number;
  unitName?: string;
}

export interface Item extends DomainObject {
  id: string;
  isVisible: boolean;
  code: string;
  name: string;
  availableQuantity: number;
  availableBatches: StockLine[];
  unitName: string;
}

export interface StockLine extends DomainObject, StockLineNode {}

export type Test = {
  id: string;
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

export interface InvoiceLine extends InvoiceLineNode, DomainObject {
  stockLine?: StockLine;
  stockLineId: string;
  invoiceId: string;
}

export interface InvoiceRow
  extends Pick<
      InvoiceNode,
      | 'comment'
      | 'entryDatetime'
      | 'id'
      | 'invoiceNumber'
      | 'otherPartyId'
      | 'otherPartyName'
      | 'status'
      | 'color'
      | 'theirReference'
      | 'type'
    >,
    DomainObject {
  pricing: InvoicePricingNode;
}
