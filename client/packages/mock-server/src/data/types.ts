import { ItemStatsNode } from './../../../common/src/types/schema';
import {
  StockLineConnector,
  InvoiceSortInput,
  InvoiceFilterInput,
  StoreNode,
  MasterListNode,
  MasterListLineNode,
} from '@openmsupply-client/common/src/types/schema';
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
  ItemsResponse,
  NameNode,
  StocktakeNode,
  StocktakeLineNode,
  InvoicePricingNode,
} from '@openmsupply-client/common/src/types/schema';

export { ItemSortFieldInput, ItemsResponse };

export interface Store extends Omit<StoreNode, '__typename'> {
  id: string;
  code: string;
  nameId: string;
}
export interface ResolvedStore extends Store {
  __typename: 'StoreNode';
}

export type Location = Omit<LocationNode, 'stock'>;

export type ResolvedLocation = LocationNode & {
  __typename: 'LocationNode';
};

export type Item = Omit<
  ItemNode,
  'availableBatches' | 'availableQuantity' | 'stats'
>;

export interface ResolvedItem extends Item {
  __typename: 'ItemNode';
  availableBatches: Required<StockLineConnector>;
  availableQuantity: number;
  stats: ItemStatsNode;
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
  locationId: string;
}

export interface ResolvedStockLine extends StockLine {
  __typename: 'StockLineNode';
  item: Item;
  location?: ResolvedLocation | null;
}

export interface InvoiceLine
  extends Omit<InvoiceLineNode, 'location' | 'item'> {
  id: string;
  locationId: string;
  itemName: string;
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
  stockLine?: ResolvedStockLine;
  location?: ResolvedLocation | null;
  item: ResolvedItem;
}

export interface Invoice
  extends Omit<InvoiceNode, 'lines' | 'otherParty' | 'pricing'> {
  totalAfterTax: number;
  pricing: InvoicePricingNode & { __typename: 'InvoicePricingNode' };
}

export interface ResolvedInvoice extends Invoice {
  __typename: 'InvoiceNode';
  lines: ListResponse<ResolvedInvoiceLine, 'InvoiceLineConnector'>;
  otherParty: NameNode;
  otherPartyName: string;
  pricing: InvoicePricingNode & { __typename: 'InvoicePricingNode' };
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
  created: InvoiceCountsCreated;
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
    | '__typename'
    | 'lines'
    | 'otherParty'
    | 'otherPartyName'
    | 'shipments'
    | 'requestRequisition'
  > {
  otherPartyId: string;
}

export interface ResolvedRequisition extends Requisition {
  __typename: 'RequisitionNode';
  lines: ListResponse<ResolvedRequisitionLine, 'RequisitionLineConnector'>;
  otherParty: ResolvedName;
  otherPartyName: string;
}

export interface RequisitionLine
  extends Omit<
    RequisitionLineNode,
    | '__typename'
    | 'itemStats'
    | 'inboundShipmentLines'
    | 'item'
    | 'outboundShipmentLines'
  > {
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

export type Stocktake = Omit<
  StocktakeNode,
  '__typename' | 'lines' | 'inventoryAdjustment'
>;
export interface ResolvedStocktake extends Stocktake {
  __typename: 'StocktakeNode';
  lines: ListResponse<ResolvedStocktakeLine, 'StocktakeLineConnector'>;
}

export interface StocktakeLine
  extends Omit<
    StocktakeLineNode,
    '__typename' | 'item' | 'stockLine' | 'location'
  > {
  stocktakeId: string;
}

export interface ResolvedStocktakeLine extends StocktakeLine {
  __typename: 'StocktakeLineNode';
}

export interface MasterListLine
  extends Omit<MasterListLineNode, '__typename' | 'item'> {
  masterListId: string;
}

export interface ResolvedMasterListLine extends MasterListLine {
  __typename: 'MasterListLineNode';
  item: ItemNode;
}

export type MasterList = Omit<MasterListNode, '__typename' | 'lines'>;

export interface ResolvedMasterList extends MasterList {
  __typename: 'MasterListNode';
  lines: ListResponse<ResolvedMasterListLine, 'MasterListLineConnector'>;
}
