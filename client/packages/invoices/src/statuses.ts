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
  [InvoiceNodeStatus.Shipped]: [
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

const INBOUND_EXTERNAL_NEXT: NextStatusMap = {
  [InvoiceNodeStatus.Shipped]: [
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

export interface StatusRulesOptions {
  isManuallyCreated?: boolean;
  inboundShipmentType?: InboundShipmentType;
}

export function getNextValidStatuses(
  invoiceType: InvoiceNodeType,
  currentStatus: InvoiceNodeStatus,
  opts?: StatusRulesOptions
): InvoiceNodeStatus[] {
  switch (invoiceType) {
    case InvoiceNodeType.OutboundShipment:
      return OUTBOUND_NEXT[currentStatus] ?? [];

    case InvoiceNodeType.Prescription:
      return PRESCRIPTION_NEXT[currentStatus] ?? [];

    case InvoiceNodeType.SupplierReturn:
      return SUPPLIER_RETURN_NEXT[currentStatus] ?? [];

    case InvoiceNodeType.CustomerReturn: {
      const map = opts?.isManuallyCreated
        ? CUSTOMER_RETURN_MANUAL_NEXT
        : CUSTOMER_RETURN_AUTO_NEXT;
      return map[currentStatus] ?? [];
    }

    case InvoiceNodeType.InboundShipment: {
      switch (opts?.inboundShipmentType) {
        case InboundShipmentType.Manual:
          return INBOUND_MANUAL_NEXT[currentStatus] ?? [];
        case InboundShipmentType.External:
          return INBOUND_EXTERNAL_NEXT[currentStatus] ?? [];
        default:
          return INBOUND_INTERNAL_NEXT[currentStatus] ?? [];
      }
    }

    default:
      return [];
  }
}

export function getStatusSequence(
  invoiceType: InvoiceNodeType,
  opts?: StatusRulesOptions
): InvoiceNodeStatus[] {
  switch (invoiceType) {
    case InvoiceNodeType.InboundShipment: {
      const key = `${InvoiceNodeType.InboundShipment}:${opts?.inboundShipmentType ?? InboundShipmentType.Internal}`;
      return STATUS_SEQUENCES[key] ?? [];
    }
    case InvoiceNodeType.CustomerReturn: {
      const suffix = opts?.isManuallyCreated ? 'Manual' : 'Auto';
      return (
        STATUS_SEQUENCES[`${InvoiceNodeType.CustomerReturn}:${suffix}`] ?? []
      );
    }
    default:
      return STATUS_SEQUENCES[invoiceType] ?? [];
  }
}

interface InvoiceDatetimes {
  createdDatetime: string;
  allocatedDatetime?: string | null;
  pickedDatetime?: string | null;
  shippedDatetime?: string | null;
  deliveredDatetime?: string | null;
  receivedDatetime?: string | null;
  verifiedDatetime?: string | null;
  cancelledDatetime?: string | null;
}

const STATUS_DATETIME_MAP: Partial<
  Record<InvoiceNodeStatus, keyof InvoiceDatetimes>
> = {
  [InvoiceNodeStatus.New]: 'createdDatetime',
  [InvoiceNodeStatus.Allocated]: 'allocatedDatetime',
  [InvoiceNodeStatus.Picked]: 'pickedDatetime',
  [InvoiceNodeStatus.Shipped]: 'shippedDatetime',
  [InvoiceNodeStatus.Delivered]: 'deliveredDatetime',
  [InvoiceNodeStatus.Received]: 'receivedDatetime',
  [InvoiceNodeStatus.Verified]: 'verifiedDatetime',
};

export function createStatusLog(
  invoice: InvoiceDatetimes & { status: InvoiceNodeStatus },
  sequence: InvoiceNodeStatus[]
): Record<InvoiceNodeStatus, null | undefined | string> {
  const currentIdx = sequence.indexOf(invoice.status);
  const statusLog = Object.fromEntries(
    Object.values(InvoiceNodeStatus).map(s => [s, null])
  ) as Record<InvoiceNodeStatus, null | undefined | string>;

  for (const [idx, status] of sequence.entries()) {
    if (currentIdx >= idx) {
      const key = STATUS_DATETIME_MAP[status];
      statusLog[status] = key ? (invoice[key] ?? null) : null;
    }
  }

  return statusLog;
}

export function getStatusOptions(
  invoiceType: InvoiceNodeType,
  currentStatus: InvoiceNodeStatus,
  getLabel: (status: InvoiceNodeStatus) => string,
  opts?: StatusRulesOptions
): SplitButtonOption<InvoiceNodeStatus>[] {
  const sequence = getStatusSequence(invoiceType, opts);
  const next = getNextValidStatuses(invoiceType, currentStatus, opts);
  const currentIdx = sequence.indexOf(currentStatus);

  return sequence
    .filter(
      status => sequence.indexOf(status) <= currentIdx || next.includes(status)
    )
    .map(status => ({
      value: status,
      label: getLabel(status),
      isDisabled: !next.includes(status),
    }));
}
