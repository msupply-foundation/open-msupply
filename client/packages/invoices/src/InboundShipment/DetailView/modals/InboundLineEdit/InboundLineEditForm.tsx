import React, { FC } from 'react';
import {
  ModalRow,
  ModalLabel,
  Grid,
  useTranslation,
  BasicTextInput,
} from '@openmsupply-client/common';
import {
  ItemRowFragment,
  StockItemSearchInput,
} from '@openmsupply-client/system';
import { useInbound } from '../../../api';

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
  const { data: items } = useInbound.lines.items();

  return (
    <>
      <ModalRow>
        <ModalLabel label={t('label.item')} justifyContent="flex-end" />
        <Grid item flex={1}>
          <StockItemSearchInput
            autoFocus={!item}
            disabled={disabled}
            currentItemId={item?.id}
            onChange={newItem => newItem && onChangeItem(newItem)}
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
