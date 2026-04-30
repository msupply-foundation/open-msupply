import React from 'react';
import {
  Grid,
  ModalLabel,
  ModalRow,
  useTranslation,
} from '@openmsupply-client/common';
import { StockItemSearchInput } from '@openmsupply-client/system';
import { useOutboundItems } from '../../api';

interface SelectItemProps {
  itemId: string | undefined;
  onChangeItem: (newItemId?: string) => void;
  disabled: boolean;
  openedWithBarcode?: boolean;
}

export const SelectItem = ({
  itemId,
  onChangeItem,
  disabled,
  openedWithBarcode = false,
}: SelectItemProps) => {
  const t = useTranslation();
  const { data: items } = useOutboundItems();

  const existingItemIds = items?.map(item => item.id);

  // Normally we exclude items already in the invoice from the search, but if we
  // opened the modal with a barcode, we want to allow selecting the same item
  // again (e.g. to add another line with the same item)
  const existingItemFilter = openedWithBarcode
    ? {}
    : { id: { notEqualAll: existingItemIds } };

  return (
    <Grid container gap="4px" width="100%">
      <ModalRow>
        <ModalLabel label={t('label.item', { count: 1 })} />
        <Grid flex={1}>
          <StockItemSearchInput
            autoFocus={!itemId}
            openOnFocus={!itemId}
            disabled={disabled}
            currentItemId={itemId}
            onChange={item => onChangeItem(item?.id)}
            filter={{
              isVisibleOrOnHand: true,
              ...existingItemFilter,
            }}
          />
        </Grid>
      </ModalRow>
    </Grid>
  );
};
