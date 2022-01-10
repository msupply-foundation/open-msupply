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
import { ModalMode } from '../../DetailView';

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

  return (
    <>
      <ModalRow>
        <ModalLabel label={t('label.item')} />
        <Grid item flex={1}>
          <ItemSearchInput
            disabled={mode === ModalMode.Update}
            currentItem={item}
            onChange={onChangeItem}
            // extraFilter={item => {
            //   const itemAlreadyInStocktake = draft.lines.some(
            //     ({ id, isDeleted }) => id === item.id && !isDeleted
            //   );
            //   return !itemAlreadyInShipment;
            // }}
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
