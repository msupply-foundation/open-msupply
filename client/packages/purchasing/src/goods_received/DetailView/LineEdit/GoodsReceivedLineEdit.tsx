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
import { GoodsReceivedLineFragment } from '../../api/operations.generated';
import { useGoodsReceivedLineEditColumns } from './columns';

export type GoodsReceivedLineItem = Partial<GoodsReceivedLineFragment>;

export interface GoodsReceivedLineEditProps {
  isUpdateMode?: boolean;
  currentLine?: GoodsReceivedLineFragment;
  draft?: DraftGoodsReceivedLine | null;
  updatePatch: (patch: Partial<DraftGoodsReceivedLine>) => void;
}

export const GoodsReceivedLineEdit = ({
  isUpdateMode,
  currentLine,
  draft,
  updatePatch,
}: GoodsReceivedLineEditProps) => {
  const showContent = !!draft && !!currentLine;

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
        {isUpdateMode && (
          <BasicTextInput
            value={`${currentLine?.item?.id} ${currentLine?.item?.name}`}
            disabled
            fullWidth
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
