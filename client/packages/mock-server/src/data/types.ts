import {
  StockLineConnector,
  InvoiceSortInput,
  InvoiceFilterInput,
  InvoiceLinesResponse,
} from './../../../common/src/types/schema';
import {
  InvoiceLineNode,
  InvoiceNode,
  ItemNode,
  StockLineNode,
  LocationNode,
  ItemFilterInput,
  PaginationInput,
  RequisitionNode,
  RequisitionLineNode,
  ItemSortFieldInput,
  ItemSortInput,
  NameSortInput,
  NameFilterInput,
  RequisitionListParameters,
  ItemsResponse,
  NameNode,
} from '@openmsupply-client/common/src/types/schema';

export { ItemSortFieldInput, RequisitionListParameters, ItemsResponse };

export interface Store {
  id: string;
  code: string;
  nameId: string;
}

export type Item = Omit<ItemNode, 'availableBatches' | 'availableQuantity'>;

export type Location = LocationNode;

export interface ResolvedItem extends Item {
  __typename: 'ItemNode';
  availableBatches: StockLineConnector;
  availableQuantity: number;
}

export interface Name extends Omit<NameNode, '__typename'> {
  id: string;
  code: string;
  name: string;
  isCustomer: boolean;
  isSupplier: boolean;
}

export interface ResolvedName extends Name {
  __typename: 'NameNode';
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
  // item: Item;
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
  lines: InvoiceLinesResponse;
  otherParty: Name;
  otherPartyName: string;
}

export interface ListResponse<T, TypeName> {
  totalCount: number;
  nodes: T[];
  __typename: TypeName;
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

export interface Requisition
  extends Omit<
    RequisitionNode,
    '__typename' | 'lines' | 'otherParty' | 'otherPartyName'
  > {
  otherPartyId: string;
}

export interface ResolvedRequisition extends Requisition {
  __typename: 'RequisitionNode';
  lines: ListResponse<ResolvedRequisitionLine, 'RequisitionLineConnector'>;
  otherParty: Name;
  otherPartyName: string;
}

export interface RequisitionLine
  extends Omit<RequisitionLineNode, '__typename'> {
  requisitionId: string;
}

export interface ResolvedRequisitionLine extends RequisitionLine {
  __typename: 'RequisitionLineNode';
}

export type ItemListParameters = {
  filter?: ItemFilterInput | null;
  page?: PaginationInput | null;
  sort?: Array<ItemSortInput> | null;
};

export type InvoiceListParameters = {
  filter?: InvoiceFilterInput | null;
  page?: PaginationInput | null;
  sort?: Array<InvoiceSortInput> | null;
};

export type NameListParameters = {
  filter?: NameFilterInput | null;
  page?: PaginationInput | null;
  sort?: Array<NameSortInput> | null;
};
