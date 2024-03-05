import React, { FC } from 'react';
import {
  ModalRow,
  ModalLabel,
  Grid,
  useTranslation,
  BasicTextInput,
} from '@openmsupply-client/common';
import {
  ItemStockOnHandFragment,
  StockItemSearchInput,
} from '@openmsupply-client/system';
import { useReturns } from '../../api';

interface ItemSelectorProps {
  item: ItemStockOnHandFragment | null;
  disabled: boolean;
  onChangeItem: (item: ItemStockOnHandFragment) => void;
}

export const ItemSelector: FC<ItemSelectorProps> = ({
  item,
  disabled,
  onChangeItem,
}) => {
  const t = useTranslation();

  const { data } = useReturns.document.outboundReturn();

  const existingItemIds = data?.lines.nodes.map(line => line.itemId);

  return (
    <>
      <ModalRow>
        <ModalLabel
          label={t('label.item', { count: 1 })}
          justifyContent="flex-end"
        />
        <Grid item flex={1}>
          <StockItemSearchInput
            autoFocus={!item}
            openOnFocus={!item}
            disabled={disabled}
            currentItemId={item?.id}
            onChange={newItem => newItem && onChangeItem(newItem)}
            extraFilter={
              disabled
                ? undefined
                : item =>
                    item.availableStockOnHand !== 0 &&
                    !existingItemIds?.some(id => id === item.id)
            }
          />
        </Grid>
      </ModalRow>
      {item && (
        <ModalRow margin={5}>
          <ModalLabel label={t('label.unit')} justifyContent="flex-end" />
          <BasicTextInput disabled sx={{ width: 150 }} value={item.unitName} />
        </ModalRow>
      )}
    </>
  );
};
