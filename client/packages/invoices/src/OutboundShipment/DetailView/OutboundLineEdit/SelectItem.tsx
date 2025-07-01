import React from 'react';
import {
  Grid,
  ModalLabel,
  ModalRow,
  useTranslation,
} from '@openmsupply-client/common';
import { StockItemSearchInput } from '@openmsupply-client/system';
import { useOutbound } from '../../api';

interface SelectItemProps {
  itemId: string | undefined;
  onChangeItem: (newItemId?: string) => void;
  disabled: boolean;
}

export const SelectItem = ({
  itemId,
  onChangeItem,
  disabled,
}: SelectItemProps) => {
  const t = useTranslation();
  const { items } = useOutbound.line.rows();

  return (
    <Grid container gap="4px" width="100%">
      <ModalRow>
        <ModalLabel label={t('label.item', { count: 1 })} />
        <Grid flex={1}>
          <StockItemSearchInput
            autoFocus={!itemId}
            openOnFocus={!itemId}
            disabled={disabled}
            currentItemId={itemId}
            onChange={item => onChangeItem(item?.id)}
            filter={{ isVisibleOrOnHand: true }}
            extraFilter={
              disabled
                ? undefined
                : item => !items?.some(({ id }) => id === item.id)
            }
          />
        </Grid>
      </ModalRow>
    </Grid>
  );
};
