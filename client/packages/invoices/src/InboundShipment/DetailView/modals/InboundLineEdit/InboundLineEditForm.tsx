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
import { useInboundItems } from '../../api';

interface InboundLineEditProps {
  item: Item | null;
  disabled: boolean;
  onChangeItem: (item: Item) => void;
}

export const InboundLineEditForm: FC<InboundLineEditProps> = ({
  item,
  disabled,
  onChangeItem,
}) => {
  const t = useTranslation('common');
  const { data } = useInboundItems();

  return (
    <>
      <ModalRow>
        <ModalLabel label={t('label.item')} />
        <Grid item flex={1}>
          <ItemSearchInput
            disabled={disabled}
            currentItem={item}
            onChange={(newItem: Item | null) =>
              newItem && onChangeItem(newItem)
            }
            extraFilter={item => {
              const itemAlreadyInShipment = data?.some(
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
            <BasicTextInput disabled sx={{ width: 150 }} value={item.code} />
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
              value={item.unitName}
            />
          </Grid>
        </ModalRow>
      )}
    </>
  );
};
