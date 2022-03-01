import {
  InboundLineFragment,
  PartialInboundLineFragment,
} from './InboundShipment/api';
import {
  OutboundShipmentLineFragment,
  PartialOutboundLineFragment,
} from './OutboundShipment/api';

export interface DraftInboundLine extends PartialInboundLineFragment {
  isCreated?: boolean;
  isUpdated?: boolean;
}

export interface DraftOutboundLine extends PartialOutboundLineFragment {
  isCreated: boolean;
  isUpdated: boolean;
}

export type InboundItem = {
  id: string;
  itemId: string;
  lines: [InboundLineFragment, ...InboundLineFragment[]];
};

export type OutboundItem = {
  id: string;
  itemId: string;
  lines: [OutboundShipmentLineFragment, ...OutboundShipmentLineFragment[]];
};
