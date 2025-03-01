import React, { useState } from 'react';
import { Grid } from '@openmsupply-client/common';
import {
  ItemSearchExtraFilter,
  StockItemSearchInput,
} from '@openmsupply-client/system';

interface ItemSelectSectionProps {
  itemId: string;
  isNew: boolean;
  disabled: boolean;
  programId?: string;
  newItemFilter: ItemSearchExtraFilter;
}

export const ItemSelectSection = ({
  isNew,
  itemId,
  disabled,
  programId,
  newItemFilter,
}: ItemSelectSectionProps) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    isNew ? null : itemId
  );

  return (
    <Grid flex={1}>
      <StockItemSearchInput
        autoFocus={isNew}
        openOnFocus={isNew}
        disabled={!isNew}
        currentItemId={selectedItemId}
        onChange={item => setSelectedItemId(item?.id ?? null)}
        includeNonVisibleWithStockOnHand
        extraFilter={disabled ? undefined : newItemFilter}
        programId={programId}
      />
    </Grid>
  );
};
