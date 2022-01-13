import React, { FC } from 'react';
import {
  Item,
  ModalRow,
  ModalLabel,
  Grid,
  useTranslation,
  BasicTextInput,
  ModalMode,
} from '@openmsupply-client/common';
import { ItemSearchInput } from '@openmsupply-client/system';
import { useStocktakeRows } from 'packages/inventory/src/Stocktake/api';

interface InboundLineEditProps {
  item: Item | null;
  mode: ModalMode;
  onChangeItem: (item: Item | null) => void;
}

export const StocktakeLineEditForm: FC<InboundLineEditProps> = ({
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
            disabled={mode === ModalMode.Update}
            currentItem={item}
            onChange={onChangeItem}
            extraFilter={item => {
              const itemAlreadyInStocktake = items?.some(
                ({ itemId }) => item.id === itemId
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
