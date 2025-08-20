import React from 'react';
import {
  Box,
  DataTable,
  Divider,
  Grid,
  PurchaseOrderNodeStatus,
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
  draft?: DraftPurchaseOrderLine | null;
  onChangeItem: (item: ItemStockOnHandFragment) => void;
  updatePatch: (patch: Partial<DraftPurchaseOrderLine>) => void;
  status: PurchaseOrderNodeStatus;
}

export const PurchaseOrderLineEdit = ({
  isUpdateMode,
  onChangeItem,
  draft,
  updatePatch,
  status,
}: PurchaseOrderLineEditProps) => {
  const showContent = !!draft;

  const lines: DraftPurchaseOrderLine[] = [];
  if (draft) {
    lines.push(draft);
  }

  const columns = usePurchaseOrderLineEditColumns({
    draft,
    updatePatch,
    status,
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
        <StockItemSearchInput
          autoFocus={!draft}
          openOnFocus={!draft}
          disabled={isUpdateMode}
          currentItemId={draft?.itemId}
          onChange={newItem => newItem && onChangeItem(newItem)}
        />
      </Grid>
      {showContent && draft && (
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
