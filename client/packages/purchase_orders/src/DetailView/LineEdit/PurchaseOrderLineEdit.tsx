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
  ItemStockOnHandFragment,
  StockItemSearchInput,
} from '@openmsupply-client/system/src';
import { DraftPurchaseOrderLine } from '../../api/hooks/usePurchaseOrderLine';
import { min } from 'lodash';
import { usePurchaseOrderLineEditColumns } from './columns';

export type PurchaseOrderLineItem = Partial<PurchaseOrderLineFragment>;
export interface PurchaseOrderLineEditProps {
  isUpdateMode?: boolean;
  currentLine?: PurchaseOrderLineFragment;
  onChangeItem: (item: ItemStockOnHandFragment) => void;
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
          <StockItemSearchInput
            autoFocus={!currentLine}
            openOnFocus={!currentLine}
            disabled={isUpdateMode}
            currentItemId={currentLine?.item.id}
            onChange={newItem => newItem && onChangeItem(newItem)}
          />
        )}
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
            />
          </Box>
        </Box>
      )}
    </Grid>
  );
};
