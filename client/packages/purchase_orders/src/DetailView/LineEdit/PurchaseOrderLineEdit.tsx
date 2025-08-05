import React from 'react';
import {
  BasicTextInput,
  Box,
  DataTable,
  Divider,
  Grid,
} from '@openmsupply-client/common';
import { PurchaseOrderLineFragment } from '../../api';
import {
  ItemWithStatsFragment,
  StockItemSearchInputWithStats,
} from '@openmsupply-client/system/src';
import { DraftPurchaseOrderLine } from '../../api/hooks/usePurchaseOrderLine';
import { min } from 'lodash';
import { usePurchaseOrderLineEditColumns } from './columns';

export type PurchaseOrderLineItem = Partial<PurchaseOrderLineFragment>;
export interface PurchaseOrderLineEditProps {
  isUpdateMode?: boolean;
  currentLine?: PurchaseOrderLineFragment;
  onChangeItem: (item: ItemWithStatsFragment) => void;
  draft?: DraftPurchaseOrderLine | null;
  updatePatch: (patch: Partial<DraftPurchaseOrderLine>) => void;
}

export const PurchaseOrderLineEdit = ({
  isUpdateMode,
  currentLine,
  onChangeItem,
  draft,
  updatePatch,
}: PurchaseOrderLineEditProps) => {
  const showContent = !!draft && !!currentLine;

  const lines: DraftPurchaseOrderLine[] = [];
  if (draft) {
    lines.push(draft);
  }

  const columns = usePurchaseOrderLineEditColumns({
    draft,
    updatePatch,
  });

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
            value={`${currentLine?.item?.code}     ${currentLine?.item?.name}`}
            disabled
            fullWidth
          />
        )) || (
          <StockItemSearchInputWithStats
            autoFocus={!currentLine}
            openOnFocus={!currentLine}
            disabled={false}
            currentItemId={currentLine?.item.id}
            onChange={(newItem: ItemWithStatsFragment | null) =>
              newItem && onChangeItem(newItem)
            }
          />
        )}
      </Grid>
      <Grid size={12} container spacing={2}>
        {/* <Grid size={6}>{}</Grid>
        TODO add update line fields here
        <Grid size={6}>{}</Grid> */}
      </Grid>
      {showContent && currentLine && (
        <Box style={{ width: '100%' }}>
          <Divider margin={10} />
          <Box
            style={{
              maxHeight: min([screen.height - 570, 325]),
              display: 'flex',
              flexDirection: 'column',
              overflowX: 'hidden',
              overflowY: 'auto',
            }}
          >
            <DataTable
              id="purchase-order-line-edit"
              columns={columns}
              data={lines}
              dense
              // additionalRows={additionalRows}
              enableColumnSelection={true}
            />
          </Box>
        </Box>
      )}
    </Grid>
  );
};
