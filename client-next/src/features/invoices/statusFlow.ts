import { InvoiceNodeStatus, InvoiceNodeType } from '@/gql/schema';

// Per-invoice-type status model, mirroring legacy invoices/src/statuses.ts:
// the display sequence, the valid forward transitions (skipping allowed), and
// the statuses in which the document/lines are still editable.
export interface InvoiceFlow {
  sequence: InvoiceNodeStatus[];
  next: Partial<Record<InvoiceNodeStatus, InvoiceNodeStatus[]>>;
  editable: InvoiceNodeStatus[];
}

const S = InvoiceNodeStatus;

const OUTBOUND: InvoiceFlow = {
  sequence: [S.New, S.Allocated, S.Picked, S.Shipped],
  next: {
    [S.New]: [S.Allocated, S.Picked, S.Shipped],
    [S.Allocated]: [S.Picked, S.Shipped],
    [S.Picked]: [S.Shipped],
  },
  editable: [S.New, S.Allocated, S.Picked],
};

const INBOUND: InvoiceFlow = {
  sequence: [S.New, S.Delivered, S.Received, S.Verified],
  next: {
    [S.New]: [S.Delivered, S.Received, S.Verified],
    [S.Delivered]: [S.Received, S.Verified],
    [S.Received]: [S.Verified],
  },
  editable: [S.New, S.Delivered, S.Received],
};

// Supplier return is outbound-style (PICKED/SHIPPED are the only advances here;
// RECEIVED/VERIFIED happen on the receiving side).
const SUPPLIER_RETURN: InvoiceFlow = {
  sequence: [S.New, S.Picked, S.Shipped, S.Received, S.Verified],
  next: { [S.New]: [S.Picked, S.Shipped], [S.Picked]: [S.Shipped] },
  editable: [S.New, S.Picked],
};

// Customer return, manually created (no linked shipment): skips Delivered; only
// RECEIVED/VERIFIED are advanced from this side.
const CUSTOMER_RETURN_MANUAL: InvoiceFlow = {
  sequence: [S.New, S.Received, S.Verified],
  next: { [S.New]: [S.Received, S.Verified], [S.Received]: [S.Verified] },
  editable: [S.New, S.Received],
};

// Customer return created automatically by a supplier-return transfer: its early
// statuses (Picked/Shipped) are mirrored from the source via sync, and only
// RECEIVED/VERIFIED are advanced from this (receiving) side.
const CUSTOMER_RETURN_AUTO: InvoiceFlow = {
  sequence: [S.New, S.Picked, S.Shipped, S.Received, S.Verified],
  next: { [S.Shipped]: [S.Received], [S.Received]: [S.Verified] },
  editable: [S.New, S.Received],
};

export interface InvoiceFlowOpts {
  /** True when the document has a linked shipment (an auto/transfer document). */
  linked?: boolean;
}

export function invoiceStatusFlow(
  type: InvoiceNodeType,
  opts?: InvoiceFlowOpts,
): InvoiceFlow {
  switch (type) {
    case InvoiceNodeType.InboundShipment:
      return INBOUND;
    case InvoiceNodeType.SupplierReturn:
      return SUPPLIER_RETURN;
    case InvoiceNodeType.CustomerReturn:
      return opts?.linked ? CUSTOMER_RETURN_AUTO : CUSTOMER_RETURN_MANUAL;
    case InvoiceNodeType.OutboundShipment:
    default:
      return OUTBOUND;
  }
}

export const isInvoiceEditable = (
  type: InvoiceNodeType,
  status: InvoiceNodeStatus,
): boolean => invoiceStatusFlow(type).editable.includes(status);

interface InvoiceDatetimes {
  createdDatetime: string;
  allocatedDatetime?: string | null;
  pickedDatetime?: string | null;
  shippedDatetime?: string | null;
  deliveredDatetime?: string | null;
  receivedDatetime?: string | null;
  verifiedDatetime?: string | null;
}

/** Maps each status to the datetime it was reached (for the StatusBar crumbs). */
export const invoiceReachedAt = (
  inv: InvoiceDatetimes,
): Partial<Record<InvoiceNodeStatus, string | null>> => ({
  [S.New]: inv.createdDatetime,
  [S.Allocated]: inv.allocatedDatetime,
  [S.Picked]: inv.pickedDatetime,
  [S.Shipped]: inv.shippedDatetime,
  [S.Delivered]: inv.deliveredDatetime,
  [S.Received]: inv.receivedDatetime,
  [S.Verified]: inv.verifiedDatetime,
});
