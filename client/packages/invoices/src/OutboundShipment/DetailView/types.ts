import {
  Invoice,
  Column,
  InvoiceLine,
  StockLine,
  OutboundShipmentStatus,
} from '@openmsupply-client/common';

export interface InvoiceLineRow extends InvoiceLine {
  updateNumberOfPacks: (quantity: number) => void;
}

export interface BatchRow extends StockLine {
  quantity: number;
}

export interface InvoiceStatusLog {
  draft?: string;
  allocated?: string;
  picked?: string;
  shipped?: string;
  finalised?: string;
}

export interface OutboundShipment extends Invoice {
  lines: InvoiceLineRow[];
  status: OutboundShipmentStatus;
  update?: <K extends keyof Invoice>(key: K, value: Invoice[K]) => void;
  upsertLine?: (line: InvoiceLine) => void;
  deleteLine?: (line: InvoiceLine) => void;
}

export enum ActionType {
  UpdateNumberOfPacks = 'OutboundShipment/updateNumberOfPacks',
  UpdateInvoice = 'OutboundShipment/updateInvoice',
  SortBy = 'OutboundShipment/sortBy',
  UpsertLine = 'OutboundShipment/upsertLine',
  DeleteLine = 'OutboundShipment/deleteLine',
}

type OutboundShipmentUpdateInvoice = {
  type: ActionType.UpdateInvoice;
  payload: { key: keyof Invoice; value: Invoice[keyof Invoice] };
};

export type OutboundShipmentAction =
  | {
      type: ActionType.UpdateNumberOfPacks;
      payload: { rowKey: string; numberOfPacks: number };
    }
  | {
      type: ActionType.SortBy;
      payload: { column: Column<InvoiceLineRow> };
    }
  | OutboundShipmentUpdateInvoice
  | {
      type: ActionType.UpsertLine;
      payload: { invoiceLine: InvoiceLine };
    }
  | {
      type: ActionType.DeleteLine;
      payload: { invoiceLine: InvoiceLine };
    };
