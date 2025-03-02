import React from 'react';
import { Grid } from '@openmsupply-client/common';
import {
  ItemSearchExtraFilter,
  StockItemSearchInput,
} from '@openmsupply-client/system';

interface ItemSelectSectionProps {
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  isNew: boolean;
  disabled: boolean;
  programId?: string;
  newItemFilter: ItemSearchExtraFilter;
}

export const ItemSelectSection = ({
  isNew,
  disabled,
  programId,
  newItemFilter,
  selectedItemId,
  setSelectedItemId,
}: ItemSelectSectionProps) => {
  return (
    <Grid flex={1}>
      <StockItemSearchInput
        autoFocus={isNew}
        openOnFocus={isNew}
        disabled={!isNew || disabled}
        currentItemId={selectedItemId}
        onChange={item => setSelectedItemId(item?.id ?? null)}
        includeNonVisibleWithStockOnHand
        extraFilter={disabled ? undefined : newItemFilter}
        programId={programId}
      />
    </Grid>
  );
};
