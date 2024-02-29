import React, { FC } from 'react';
import {
  ModalRow,
  ModalLabel,
  Grid,
  useTranslation,
  ModalMode,
  BasicTextInput,
} from '@openmsupply-client/common';
import {
  StockItemSearchInput,
  ItemRowFragment,
  ItemStockOnHandFragment,
} from '@openmsupply-client/system';
import { StocktakeSummaryItem } from '../../../../types';

interface StocktakeLineEditProps {
  item: ItemRowFragment | null;
  items: StocktakeSummaryItem[];
  mode: ModalMode | null;
  onChangeItem: (item: ItemStockOnHandFragment | null) => void;
}

export const StocktakeLineEditForm: FC<StocktakeLineEditProps> = ({
  item,
  items,
  mode,
  onChangeItem,
}) => {
  const t = useTranslation('inventory');
  const disabled = mode === ModalMode.Update;

  return (
    <>
      <ModalRow>
        <ModalLabel label={t('label.item', { count: 1 })} />
        <Grid item flex={1} padding={1}>
          <StockItemSearchInput
            autoFocus={!item}
            openOnFocus={!item}
            disabled={disabled}
            currentItemId={item?.id}
            onChange={onChangeItem}
            extraFilter={
              disabled
                ? undefined
                : item => !items?.some(({ id }) => id === item.id)
            }
          />
        </Grid>
      </ModalRow>
      {item && (
        <ModalRow margin={3}>
          <ModalLabel label={t('label.unit')} justifyContent="flex-end" />
          <BasicTextInput
            disabled
            sx={{ width: 150 }}
            value={item.unitName ?? ''}
          />
        </ModalRow>
      )}
    </>
  );
};
