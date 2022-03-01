import {
  OutboundShipmentLineFragment,
  PartialOutboundLineFragment,
  // OutboundShipmentFragment,
} from './OutboundShipment/api/operations.generated';
import { LocationRowFragment } from '@openmsupply-client/system/src/Location/api/operations.generated';
import {
  StockLine,
  InvoiceNode,
  InvoiceNodeStatus,
  DomainObject,
  InvoicePricingNode,
  Name,
  InvoiceLineNode,
} from '@openmsupply-client/common';

export interface InvoiceLine
  extends Omit<InvoiceLineNode, 'item' | 'location' | 'stockLine'>,
    DomainObject {
  stockLine?: StockLine | null;
  stockLineId: string;
  unitName?: string;
  invoiceId: string;
  location?: LocationRowFragment | null;
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

export interface DraftOutboundLine extends PartialOutboundLineFragment {
  isCreated: boolean;
  isUpdated: boolean;
}

export type InboundShipmentItem = {
  id: string;
  itemId: string;
  lines: [InvoiceLine, ...InvoiceLine[]];
};

export type OutboundItem = {
  id: string;
  itemId: string;
  lines: [OutboundShipmentLineFragment, ...OutboundShipmentLineFragment[]];
};
