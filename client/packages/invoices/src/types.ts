import { InboundLineFragment } from './InboundShipment/api';
import { OutboundLineFragment } from './OutboundShipment/api';
import { PrescriptionLineFragment } from './Prescriptions/api';

export interface DraftInboundLine extends InboundLineFragment {
  isCreated?: boolean;
  isDeleted?: boolean;
  isUpdated?: boolean;
}

export interface DraftOutboundLine extends OutboundLineFragment {
  isCreated?: boolean;
  isUpdated?: boolean;
  isDeleted?: boolean;
}

export type InboundItem = {
  id: string;
  itemId: string;
  lines: InboundLineFragment[];
};

export type OutboundItem = {
  id: string;
  itemId: string;
  lines: OutboundLineFragment[];
};

export type PrescriptionItem = {
  id: string;
  itemId: string;
  lines: PrescriptionLineFragment[];
};
