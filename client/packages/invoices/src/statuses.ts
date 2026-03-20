import {
  InvoiceNodeStatus,
  InvoiceNodeType,
  SplitButtonOption,
} from '@openmsupply-client/common';
import { InboundShipmentType } from './utils';

// Single source of truth for status sequences per invoice type.

export const STATUS_SEQUENCES: Record<string, InvoiceNodeStatus[]> = {
  [InvoiceNodeType.OutboundShipment]: [
    InvoiceNodeStatus.New,
    InvoiceNodeStatus.Allocated,
    InvoiceNodeStatus.Picked,
    InvoiceNodeStatus.Shipped,
    InvoiceNodeStatus.Delivered,
    InvoiceNodeStatus.Received,
    InvoiceNodeStatus.Verified,
  ],

  [InvoiceNodeType.Prescription]: [
    InvoiceNodeStatus.New,
    InvoiceNodeStatus.Picked,
    InvoiceNodeStatus.Verified,
    InvoiceNodeStatus.Cancelled,
  ],

  [InvoiceNodeType.SupplierReturn]: [
    InvoiceNodeStatus.New,
    InvoiceNodeStatus.Picked,
    InvoiceNodeStatus.Shipped,
    InvoiceNodeStatus.Received,
    InvoiceNodeStatus.Verified,
  ],

  [`${InvoiceNodeType.InboundShipment}:Internal`]: [
    InvoiceNodeStatus.New,
    InvoiceNodeStatus.Picked,
    InvoiceNodeStatus.Shipped,
    InvoiceNodeStatus.Delivered,
    InvoiceNodeStatus.Received,
    InvoiceNodeStatus.Verified,
  ],
  [`${InvoiceNodeType.InboundShipment}:Manual`]: [
    InvoiceNodeStatus.New,
    InvoiceNodeStatus.Delivered,
    InvoiceNodeStatus.Received,
    InvoiceNodeStatus.Verified,
  ],
  [`${InvoiceNodeType.InboundShipment}:External`]: [
    InvoiceNodeStatus.New,
    InvoiceNodeStatus.Shipped,
    InvoiceNodeStatus.Delivered,
    InvoiceNodeStatus.Received,
    InvoiceNodeStatus.Verified,
  ],
  [`${InvoiceNodeType.CustomerReturn}:Auto`]: [
    InvoiceNodeStatus.New,
    InvoiceNodeStatus.Picked,
    InvoiceNodeStatus.Shipped,
    InvoiceNodeStatus.Received,
    InvoiceNodeStatus.Verified,
  ],
  [`${InvoiceNodeType.CustomerReturn}:Manual`]: [
    InvoiceNodeStatus.New,
    InvoiceNodeStatus.Received,
    InvoiceNodeStatus.Verified,
  ],
};

type NextStatusMap = Partial<Record<InvoiceNodeStatus, InvoiceNodeStatus[]>>;

const OUTBOUND_NEXT: NextStatusMap = {
  [InvoiceNodeStatus.New]: [
    InvoiceNodeStatus.Allocated,
    InvoiceNodeStatus.Picked,
    InvoiceNodeStatus.Shipped,
  ],
  [InvoiceNodeStatus.Allocated]: [
    InvoiceNodeStatus.Picked,
    InvoiceNodeStatus.Shipped,
  ],
  [InvoiceNodeStatus.Picked]: [InvoiceNodeStatus.Shipped],
};

const PRESCRIPTION_NEXT: NextStatusMap = {
  [InvoiceNodeStatus.New]: [
    InvoiceNodeStatus.Picked,
    InvoiceNodeStatus.Verified,
  ],
  [InvoiceNodeStatus.Picked]: [InvoiceNodeStatus.Verified],
};

const SUPPLIER_RETURN_NEXT: NextStatusMap = {
  [InvoiceNodeStatus.New]: [
    InvoiceNodeStatus.Picked,
    InvoiceNodeStatus.Shipped,
  ],
  [InvoiceNodeStatus.Picked]: [InvoiceNodeStatus.Shipped],
};

const CUSTOMER_RETURN_MANUAL_NEXT: NextStatusMap = {
  [InvoiceNodeStatus.New]: [
    InvoiceNodeStatus.Received,
    InvoiceNodeStatus.Verified,
  ],
  [InvoiceNodeStatus.Received]: [InvoiceNodeStatus.Verified],
};

const CUSTOMER_RETURN_AUTO_NEXT: NextStatusMap = {
  [InvoiceNodeStatus.Shipped]: [
    InvoiceNodeStatus.Received,
    InvoiceNodeStatus.Verified,
  ],
  [InvoiceNodeStatus.Received]: [InvoiceNodeStatus.Verified],
};

const INBOUND_INTERNAL_NEXT: NextStatusMap = {
  [InvoiceNodeStatus.Delivered]: [
    InvoiceNodeStatus.Received,
    InvoiceNodeStatus.Verified,
  ],
  [InvoiceNodeStatus.Received]: [InvoiceNodeStatus.Verified],
};

const INBOUND_EXTERNAL_NEXT: NextStatusMap = {
  [InvoiceNodeStatus.Delivered]: [
    InvoiceNodeStatus.Received,
    InvoiceNodeStatus.Verified,
  ],
  [InvoiceNodeStatus.Received]: [InvoiceNodeStatus.Verified],
};

const INBOUND_MANUAL_NEXT: NextStatusMap = {
  [InvoiceNodeStatus.New]: [
    InvoiceNodeStatus.Delivered,
    InvoiceNodeStatus.Received,
    InvoiceNodeStatus.Verified,
  ],
  [InvoiceNodeStatus.Delivered]: [
    InvoiceNodeStatus.Received,
    InvoiceNodeStatus.Verified,
  ],
  [InvoiceNodeStatus.Received]: [InvoiceNodeStatus.Verified],
};
