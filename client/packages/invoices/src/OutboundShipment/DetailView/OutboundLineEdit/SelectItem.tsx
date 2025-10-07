import React from 'react';
import {
  Grid,
  ModalLabel,
  ModalRow,
  useTranslation,
} from '@openmsupply-client/common';
import { StockItemSearchInput } from '@openmsupply-client/system';
import { useOutboundItems } from '../../api';

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
  const { data: items } = useOutboundItems();

  const existingItemIds = items?.map(item => item.id);

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
            filter={{
              isVisibleOrOnHand: true,
              id: { notEqualAll: existingItemIds },
            }}
          />
        </Grid>
      </ModalRow>
    </Grid>
  );
};
