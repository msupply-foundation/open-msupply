import React, { FC } from 'react';
import {
  Item,
  ModalRow,
  ModalLabel,
  Grid,
  useTranslation,
} from '@openmsupply-client/common';
import { InboundShipmentItem } from '../../../types';
import { ItemSearchInput } from '@openmsupply-client/system';
interface InboundLineEditProps {
  item: InboundShipmentItem | null;
  onUpsert: (item: InboundShipmentItem) => void;
  onChangeItem: (item: Item | null) => void;
}

export const InboundLineEdit: FC<InboundLineEditProps> = ({
  item,
  onChangeItem,
}) => {
  const t = useTranslation('common');

  return (
    <ModalRow>
      <ModalLabel label={t('label.item')} />
      <Grid item flex={1}>
        <ItemSearchInput
          currentItemName={item?.itemName}
          onChange={onChangeItem}
        />
      </Grid>
    </ModalRow>
  );
};
