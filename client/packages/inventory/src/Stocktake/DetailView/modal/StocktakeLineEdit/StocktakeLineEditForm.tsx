import React, { FC } from 'react';
import {
  ModalRow,
  ModalLabel,
  Grid,
  useTranslation,
  ModalMode,
  BasicTextInput,
  Alert,
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
  hasInvalidLocationLines: boolean;
  onChangeItem: (item: ItemStockOnHandFragment | null) => void;
}

export const StocktakeLineEditForm: FC<StocktakeLineEditProps> = ({
  item,
  items,
  mode,
  hasInvalidLocationLines,
  onChangeItem,
}) => {
  const t = useTranslation();
  const disabled = mode === ModalMode.Update;

  const existingItemIds = items.map(item => item.item?.id ?? '');

  return (
    <>
      <ModalRow>
        <ModalLabel label={t('label.item', { count: 1 })} />
        <Grid flex={1} padding={1}>
          <StockItemSearchInput
            autoFocus={!item}
            openOnFocus={!item}
            disabled={disabled}
            currentItemId={item?.id}
            onChange={onChangeItem}
            filter={{
              isVisibleOrOnHand: true,
              id: { notEqualAll: existingItemIds },
            }}
          />
        </Grid>
      </ModalRow>
      {item && (
        <ModalRow margin={3}>
          <ModalLabel label={t('label.unit')} />
          <BasicTextInput
            disabled
            sx={{ width: 150 }}
            value={item.unitName ?? ''}
          />
        </ModalRow>
      )}
      {hasInvalidLocationLines && (
        <ModalRow margin={3}>
          <Alert
            severity="warning"
            sx={{ maxWidth: 800, margin: '0 auto', mt: 0.5 }}
          >
            {t('messages.stock-location-invalid-many')}
          </Alert>
        </ModalRow>
      )}
    </>
  );
};
