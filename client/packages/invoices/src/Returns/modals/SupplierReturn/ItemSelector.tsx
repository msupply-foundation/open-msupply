import React, { FC } from 'react';
import {
  ModalRow,
  ModalLabel,
  Grid,
  useTranslation,
  Box,
} from '@openmsupply-client/common';
import { StockItemSearchInput } from '@openmsupply-client/system';
import { useReturns } from '../../api';

interface ItemSelectorProps {
  itemId: string | undefined;
  disabled: boolean;
  onChangeItemId: (item: string) => void;
}

export const ItemSelector: FC<ItemSelectorProps> = ({
  itemId,
  disabled,
  onChangeItemId,
}) => {
  const t = useTranslation();

  const { data } = useReturns.document.supplierReturn();

  const existingItemIds = data?.lines.nodes.map(line => line.itemId);

  return (
    <Box marginBottom="14px">
      <ModalRow>
        <ModalLabel
          label={t('label.item', { count: 1 })}
          justifyContent="flex-end"
        />
        <Grid flex={1}>
          <StockItemSearchInput
            autoFocus={!itemId}
            openOnFocus={!itemId}
            disabled={disabled}
            currentItemId={itemId}
            onChange={newItem => newItem && onChangeItemId(newItem.id)}
            filter={{ hasStockOnHand: true }}
            extraFilter={
              disabled
                ? undefined
                : item => !existingItemIds?.some(id => id === item.id)
            }
          />
        </Grid>
      </ModalRow>
    </Box>
  );
};
