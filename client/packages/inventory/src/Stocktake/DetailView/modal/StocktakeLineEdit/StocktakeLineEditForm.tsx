import React, { FC } from 'react';
import {
  ModalRow,
  ModalLabel,
  Grid,
  useTranslation,
  ModalMode,
} from '@openmsupply-client/common';
import {
  StockItemSearchInput,
  ItemRowFragment,
} from '@openmsupply-client/system';
import { useStocktake } from '../../../api';

interface StocktakeLineEditProps {
  item: ItemRowFragment | null;
  mode: ModalMode | null;
  onChangeItem: (item: ItemRowFragment | null) => void;
}

export const StocktakeLineEditForm: FC<StocktakeLineEditProps> = ({
  item,
  mode,
  onChangeItem,
}) => {
  const t = useTranslation(['common', 'inventory']);
  const { items } = useStocktake.line.rows();
  const disabled = mode === ModalMode.Update;

  return (
    <>
      <ModalRow>
        <ModalLabel label={t('label.item')} />
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
    </>
  );
};
