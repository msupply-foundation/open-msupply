import React from 'react';
import { BasicTextInput, Grid } from '@openmsupply-client/common';
import { PurchaseOrderLineFragment } from '../../api';
import {
  ItemWithStatsFragment,
  StockItemSearchInputWithStats,
} from '@openmsupply-client/system/src';

export type PurchaseOrderLineItem = Partial<PurchaseOrderLineFragment>;
export interface PurchaseOrderLineEditProps {
  isUpdateMode?: boolean;
  currentItem?: PurchaseOrderLineFragment;
  lines: PurchaseOrderLineFragment[];
  onChangeItem: (item: ItemWithStatsFragment) => void;
  // TODO add line update
  // onUpdate: (patch: Partial<PurchaseOrderLineFragment>) => void;
}

export const PurchaseOrderLineEdit = ({
  isUpdateMode,
  currentItem,
  lines,
  onChangeItem,
  // TODO add line update
  // onUpdate,
}: PurchaseOrderLineEditProps) => {
  return (
    <Grid
      container
      spacing={1}
      direction="row"
      bgcolor="background.toolbar"
      padding={2}
      paddingBottom={1}
    >
      <Grid size={12} sx={{ mb: 2 }}>
        {(isUpdateMode && (
          <BasicTextInput
            value={`${currentItem?.item?.code}     ${currentItem?.item?.name}`}
            disabled
            fullWidth
          />
        )) || (
          <StockItemSearchInputWithStats
            autoFocus={!currentItem}
            openOnFocus={!currentItem}
            disabled={false}
            currentItemId={currentItem?.id}
            onChange={(newItem: ItemWithStatsFragment | null) =>
              newItem && onChangeItem(newItem)
            }
            extraFilter={item => !lines.some(line => line.item.id === item.id)}
          />
        )}
      </Grid>
      <Grid size={12} container spacing={2}>
        {/* <Grid size={6}>{}</Grid>
        TODO add update line fields here
        <Grid size={6}>{}</Grid> */}
      </Grid>
    </Grid>
  );
};
