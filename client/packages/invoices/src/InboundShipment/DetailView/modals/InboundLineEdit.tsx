import { FC } from 'react';
import { Item } from '@openmsupply-client/common';
import { InboundShipmentItem } from '../../../types';
interface InboundLineEditProps {
  item: InboundShipmentItem | null;
  onUpsert: (item: InboundShipmentItem) => void;
  onChangeItem: (item: Item | null) => void;
}

export const InboundLineEdit: FC<InboundLineEditProps> = () => {
  return null;
};
