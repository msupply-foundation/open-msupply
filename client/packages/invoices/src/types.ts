import {
  Invoice,
  Column,
  InvoiceLine,
  StockLine,
  OutboundShipmentStatus,
  InboundShipmentStatus,
} from '@openmsupply-client/common';

export interface BatchRow extends StockLine {
  numberOfPacks: number;
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
  DeleteLine = 'OutboundShipment/deleteLine',
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
      type: ActionType.DeleteLine;
      payload: { line: OutboundShipmentRow };
    };

export interface OutboundShipmentRow extends InvoiceLine {
  updateNumberOfPacks?: (quantity: number) => void;
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
  locationDescription?: string | null;
  itemUnit?: string;
  batch?: string | null;
  batches: Record<string, OutboundShipmentRow>;
  sellPrice?: number | undefined;
  packSize?: number | undefined;
  note?: string | null;
  isDeleted?: boolean;
};

export interface OutboundShipment extends Invoice {
  items: OutboundShipmentSummaryItem[];
  status: OutboundShipmentStatus;
  update?: <K extends keyof Invoice>(key: K, value: Invoice[K]) => void;
  upsertLine?: (line: OutboundShipmentRow) => void;
  deleteLine?: (line: OutboundShipmentRow) => void;
}
export interface InboundShipmentRow extends InvoiceLine {
  updateNumberOfPacks?: (quantity: number) => void;
  stockLineId: string;
  invoiceId: string;
  itemId: string;
  isUpdated?: boolean;
  isDeleted?: boolean;
  isCreated?: boolean;
}

export type InboundShipmentItem = {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unitQuantity: number;
  numberOfPacks: number;
  locationDescription?: string | null;
  itemUnit?: string;
  batch?: string | null;
  batches: Record<string, OutboundShipmentRow>;
  sellPrice?: number | undefined;
  packSize?: number | undefined;
  note?: string | null;
  isDeleted?: boolean;
};

export interface InboundShipment extends Invoice {
  items: InboundShipmentItem[];
  status: InboundShipmentStatus;
  update?: <K extends keyof Invoice>(key: K, value: Invoice[K]) => void;
  upsertLine?: (line: InboundShipmentRow) => void;
  deleteLine?: (line: InboundShipmentRow) => void;
}
