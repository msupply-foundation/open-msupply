import React, { FC } from 'react';
import {
  Item,
  ModalRow,
  ModalLabel,
  Grid,
  useTranslation,
  BasicTextInput,
} from '@openmsupply-client/common';
import { ItemSearchInput } from '@openmsupply-client/system';
import { StocktakeController, StocktakeItem } from '../../../../types';
import { ModalMode } from '../../DetailView';

const itemToStocktakeItem = (item: Item): StocktakeItem => {
  return {
    id: item.id,
    itemCode: () => item.code,
    itemName: () => item.name,
    expiryDate: () => '',
    countedNumPacks: () => '',
    snapshotNumPacks: () => '',
    lines: [],
    batch: () => '',
  };
};

interface InboundLineEditProps {
  item: StocktakeItem | null;
  mode: ModalMode;
  onChangeItem: (item: StocktakeItem) => void;
  draft: StocktakeController;
}

export const StocktakeLineEditForm: FC<InboundLineEditProps> = ({
  item,
  mode,
  onChangeItem,
  draft,
}) => {
  const t = useTranslation(['common', 'inventory']);

  return (
    <>
      <ModalRow>
        <ModalLabel label={t('label.item')} />
        <Grid item flex={1}>
          <ItemSearchInput
            disabled={mode === ModalMode.Update}
            currentItem={{
              id: item?.id ?? '',
              name: item?.itemName() ?? '',
              code: item?.itemCode() ?? '',
              isVisible: true,
              availableBatches: [],
              unitName: '',
              availableQuantity: 0,
            }}
            onChange={(newItem: Item | null) =>
              newItem && onChangeItem(itemToStocktakeItem(newItem))
            }
            extraFilter={item => {
              const itemAlreadyInShipment = draft.lines.some(
                ({ id, isDeleted }) => id === item.id && !isDeleted
              );
              return !itemAlreadyInShipment;
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
              value={item.itemCode()}
            />
          </Grid>
        </ModalRow>
      )}
    </>
  );
};
