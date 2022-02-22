import {
  Column,
  StockLine,
  InvoiceNode,
  InvoiceNodeStatus,
  DomainObject,
  InvoicePricingNode,
  Name,
  InvoiceLineNode,
} from '@openmsupply-client/common';
import { Location } from '@openmsupply-client/system';

/**
 * Invoice, InvoiceRow and InvoiceLine extend the GQL types, mostly. GQL types for related entities
 * are not included as they are unions of errors or other types which make them difficult to use
 * in the UI. Additionally, to ensure types can be required when needed (i.e. different queries for different fields)
 * we use the GQL types as the base for our types and transform them in the API layer to easier to use types.
 * In the UI we transform these generic Invoice types to the more
 * specialised types such as OutboundShipment or InboundShipment.
 * TODO: Maybe we can get away with just using `Shipment` for both.
 */

export interface InvoiceLine
  extends Omit<InvoiceLineNode, 'item' | 'type' | 'location' | 'stockLine'>,
    DomainObject {
  stockLine?: StockLine;
  stockLineId: string;
  unitName?: string;
  invoiceId: string;
  location?: Location;
}

export interface InvoiceRow
  extends Pick<
      InvoiceNode,
      | '__typename'
      | 'comment'
      | 'createdDatetime'
      | 'id'
      | 'invoiceNumber'
      | 'otherPartyId'
      | 'otherPartyName'
      | 'status'
      | 'colour'
      | 'theirReference'
      | 'type'
    >,
    DomainObject {
  pricing: InvoicePricingNode;
}

export interface Invoice
  extends Omit<InvoiceNode, 'lines' | 'status' | 'otherParty' | 'pricing'>,
    DomainObject {
  status: InvoiceNodeStatus;
  otherParty?: Name;
  lines: InvoiceLine[];
  pricing: {
    totalAfterTax: number;
  };
}

export interface BatchRow extends StockLine {
  numberOfPacks: number;
}

export interface DraftOutboundLine
  extends InvoiceLine,
    Omit<StockLine, 'expiryDate' | 'location'> {
  isCreated: boolean;
  isUpdated: boolean;
}

export interface InvoiceStatusLog {
  draft?: string;
  allocated?: string;
  picked?: string;
  shipped?: string;
  finalised?: string;
}

export enum ActionType {
  UpdateNumberOfPacks = 'OutboundShipment/updateNumberOfPacks',
  UpdateInvoice = 'OutboundShipment/updateInvoice',
  SortBy = 'OutboundShipment/sortBy',
  UpsertLine = 'OutboundShipment/upsertLine',
  UpsertItem = 'OutboundShipment/upsertItem',
  DeleteLine = 'OutboundShipment/deleteLine',
  DeleteItem = 'OutboundShipment/deleteItem',
  Group = 'OutboundShipment/group',
  Flatten = 'OutboundShipment/flatten',
}

export type OutboundShipmentAction =
  | {
      type: ActionType.UpdateNumberOfPacks;
      payload: { rowKey: string; numberOfPacks: number };
    }
  | {
      type: ActionType.SortBy;
      payload: { column: Column<OutboundShipmentSummaryItem> };
    }
  | {
      type: ActionType.UpdateInvoice;
      payload: { key: keyof Invoice; value: Invoice[keyof Invoice] };
    }
  | {
      type: ActionType.UpsertLine;
      payload: { line: OutboundShipmentRow };
    }
  | {
      type: ActionType.UpsertItem;
      payload: { item: OutboundShipmentSummaryItem };
    }
  | {
      type: ActionType.DeleteLine;
      payload: { line: OutboundShipmentRow };
    }
  | {
      type: ActionType.DeleteItem;
      payload: { item: OutboundShipmentSummaryItem };
    }
  | {
      type: ActionType.Flatten;
    }
  | {
      type: ActionType.Group;
    };
export interface OutboundShipmentRow extends Omit<InvoiceLine, 'item'> {
  stockLineId: string;
  invoiceId: string;
  itemId: string;
  isUpdated?: boolean;
  isDeleted?: boolean;
  isCreated?: boolean;
}

export type OutboundShipmentSummaryItem = {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unitQuantity: number;
  numberOfPacks: number;
  locationName?: string | null;
  unitName?: string;
  batch?: string | null;
  batches: Record<string, OutboundShipmentRow>;
  sellPricePerPack?: number | undefined;
  sellPricePerUnit?: number | undefined;
  packSize?: number | undefined;
  note?: string | null;
  isDeleted?: boolean;
  canExpand?: boolean;
  expiryDate?: string | null;
  lineTotal?: number;
};

export interface OutboundShipment extends Omit<Invoice, 'lines'> {
  items: OutboundShipmentSummaryItem[];
  status: InvoiceNodeStatus;
  update?: <K extends keyof Invoice>(key: K, value: Invoice[K]) => void;
  upsertLine?: (line: OutboundShipmentRow) => void;
  deleteLine?: (line: OutboundShipmentRow) => void;
}

export type InboundShipmentItem = {
  id: string;
  itemId: string;
  lines: [InvoiceLine, ...InvoiceLine[]];
};

export type InvoiceItem = {
  id: string;
  itemId: string;
  lines: [InvoiceLine, ...InvoiceLine[]];
};
