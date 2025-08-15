import React from 'react';
import {
  BasicTextInput,
  Box,
  DataTable,
  Divider,
  Grid,
} from '@openmsupply-client/common';
import { min } from 'lodash';
import { DraftGoodsReceivedLine } from '../../api/hooks/useGoodsReceivedLine';
import { useGoodsReceivedLineEditColumns } from './columns';
import { StockItemSearchInput } from 'packages/system/src';

export type GoodsReceivedLineItem = Partial<DraftGoodsReceivedLine>;

export interface GoodsReceivedLineEditProps {
  isUpdateMode?: boolean;
  draft?: DraftGoodsReceivedLine | null;
  updatePatch: (patch: Partial<DraftGoodsReceivedLine>) => void;
}

export const GoodsReceivedLineEdit = ({
  isUpdateMode,
  draft,
  updatePatch,
}: GoodsReceivedLineEditProps) => {
  const showContent = !!draft;

  const lines: DraftGoodsReceivedLine[] = [];
  if (draft) lines.push(draft);

  const columns = useGoodsReceivedLineEditColumns({
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
        {isUpdateMode ? (
          <BasicTextInput
            value={`${draft?.itemId} ${draft?.id}`} // TODO: We need item name here
            disabled
            fullWidth
          />
        ) : (
          <StockItemSearchInput
            autoFocus={!draft?.itemId}
            openOnFocus={!draft?.itemId}
            disabled={isUpdateMode}
            currentItemId={draft?.itemId}
            onChange={() => {}}
          />
        )}
      </Grid>
      {showContent && (
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
