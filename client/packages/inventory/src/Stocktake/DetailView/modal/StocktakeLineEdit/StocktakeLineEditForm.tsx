import React, { FC } from 'react';
import {
  ModalRow,
  ModalLabel,
  Grid,
  useTranslation,
  BasicTextInput,
  ModalMode,
} from '@openmsupply-client/common';
import { ItemSearchInput, ItemRowFragment } from '@openmsupply-client/system';
import { useStocktakeRows } from 'packages/inventory/src/Stocktake/api';

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
  const { items } = useStocktakeRows();

  return (
    <>
      <ModalRow>
        <ModalLabel label={t('label.item')} />
        <Grid item flex={1}>
          <ItemSearchInput
            autoFocus={!item}
            disabled={mode === ModalMode.Update}
            currentItemId={item?.id}
            onChange={onChangeItem}
            extraFilter={itemToCheck => {
              const itemAlreadyInStocktake = items?.some(
                ({ item }) => itemToCheck.id === item?.id
              );
              return !itemAlreadyInStocktake;
            }}
          />
        </Grid>
      </ModalRow>
      {item && (
        <ModalRow>
          <Grid style={{ display: 'flex', marginTop: 10 }} flex={1}>
            <ModalLabel label={t('label.code')} />
            <BasicTextInput
              disabled
              sx={{ width: 150 }}
              value={item.code ?? ''}
            />
          </Grid>
        </ModalRow>
      )}
    </>
  );
};
