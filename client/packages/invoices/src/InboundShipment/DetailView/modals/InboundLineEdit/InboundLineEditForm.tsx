import React, { FC } from 'react';
import {
  ModalRow,
  ModalLabel,
  Grid,
  useTranslation,
  BasicTextInput,
} from '@openmsupply-client/common';
import { ItemRowFragment, ItemSearchInput } from '@openmsupply-client/system';
import { useInboundItems } from '../../../api';

interface InboundLineEditProps {
  item: ItemRowFragment | null;
  disabled: boolean;
  onChangeItem: (item: ItemRowFragment) => void;
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
        <ModalLabel label={t('label.item')} justifyContent="flex-end" />
        <Grid item flex={1}>
          <ItemSearchInput
            disabled={disabled}
            currentItemId={item?.id}
            onChange={(newItem: ItemRowFragment | null) =>
              newItem && onChangeItem(newItem)
            }
            extraFilter={item => {
              const itemAlreadyInShipment = data?.some(
                ({ id }) => id === item.id
              );
              return !itemAlreadyInShipment;
            }}
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
