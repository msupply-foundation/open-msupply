import React, { FC } from 'react';
import {
  Item,
  ModalRow,
  ModalLabel,
  Grid,
  useTranslation,
  BasicTextInput,
} from '@openmsupply-client/common';
import { InboundShipment, InboundShipmentItem } from '../../../../types';
import { ItemSearchInput } from '@openmsupply-client/system';
import { ModalMode } from '../../DetailView';
import { itemToSummaryItem } from './utils';

interface InboundLineEditProps {
  item: InboundShipmentItem | null;
  mode: ModalMode;
  onChangeItem: (item: InboundShipmentItem) => void;
  draft: InboundShipment;
}

export const InboundLineEditForm: FC<InboundLineEditProps> = ({
  item,
  mode,
  onChangeItem,
  draft,
}) => {
  const t = useTranslation('common');
  return (
    <>
      <ModalRow>
        <ModalLabel label={t('label.item')} />
        <Grid item flex={1}>
          <ItemSearchInput
            disabled={mode === ModalMode.Update}
            currentItem={{
              name: item?.itemName ?? '',
              id: item?.itemId ?? '',
              code: item?.itemCode ?? '',
              isVisible: true,
              availableBatches: [],
              unitName: '',
              availableQuantity: 0,
            }}
            onChange={(newItem: Item | null) =>
              newItem && onChangeItem(itemToSummaryItem(newItem))
            }
            extraFilter={item => {
              const itemAlreadyInShipment = draft.items.some(
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
              value={item.itemCode}
            />
          </Grid>
          <Grid
            style={{ display: 'flex', marginTop: 10 }}
            justifyContent="flex-end"
            flex={1}
          >
            <ModalLabel label={t('label.unit')} justifyContent="flex-end" />
            <BasicTextInput
              disabled
              sx={{ width: 150 }}
              value={item.itemUnit}
            />
          </Grid>
        </ModalRow>
      )}
    </>
  );
};
