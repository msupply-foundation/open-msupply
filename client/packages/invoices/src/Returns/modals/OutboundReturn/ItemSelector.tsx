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
  // TODO: filter out items that are already included
  // const { data: items } = useReturns.lines.items();

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
              disabled ? undefined : item => item.availableStockOnHand !== 0
              // TODO: filter out items that are already included
              // : item => !items?.some(({ id }) => id === item.id)
            }
          />
        </Grid>
      </ModalRow>
      {item && (
        <ModalRow margin={3}>
          <ModalLabel label={t('label.unit')} justifyContent="flex-end" />
          <BasicTextInput
            disabled
            sx={{ width: 150, marginBottom: '10px' }}
            value={item.unitName ?? ''}
          />
        </ModalRow>
      )}
    </>
  );
};
