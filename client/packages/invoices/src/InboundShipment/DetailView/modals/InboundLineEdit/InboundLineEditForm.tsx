import React from 'react';
import {
  ModalRow,
  ModalLabel,
  Grid,
  useTranslation,
  BasicTextInput,
} from '@openmsupply-client/common';
import {
  ItemRowFragment,
  ItemStockOnHandFragment,
  StockItemSearchInput,
} from '@openmsupply-client/system';
import { useInbound } from '../../../api';

interface InboundLineEditProps {
  item: ItemRowFragment | null;
  disabled: boolean;
  onChangeItem: (item: ItemStockOnHandFragment | null) => void;
}

export const InboundLineEditForm = ({
  item,
  disabled,
  onChangeItem,
}: InboundLineEditProps) => {
  const t = useTranslation();
  const { data: items } = useInbound.lines.items();

  const existingItemIds = items?.map(line => line.itemId);

  return (
    <>
      <ModalRow>
        <ModalLabel
          label={t('label.item', { count: 1 })}
          justifyContent="flex-end"
        />
        <Grid flex={1}>
          <StockItemSearchInput
            autoFocus={!item}
            openOnFocus={!item}
            disabled={disabled}
            currentItemId={item?.id}
            onChange={newItem => onChangeItem(newItem)}
            filter={{ id: { notEqualAll: existingItemIds } }}
            // A scanned-in item will only have an ID, not a full item object,
            // so this flag makes the StockItemSearchInput component update the
            // current item on initial load from the API
            initialUpdate={!item?.name}
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
