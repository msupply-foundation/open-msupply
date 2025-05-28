import React from 'react';
import {
  Divider,
  Box,
  DataTable,
  useTranslation,
  useFormatNumber,
} from '@openmsupply-client/common';

import { usePrescriptionLineEditColumns } from './columns';
import { getAllocatedQuantity, useAllocationContext } from '../../StockOut';

export interface PrescriptionLineEditTableProps {
  disabled?: boolean;
}

export const PrescriptionLineEditTable = ({
  disabled,
}: PrescriptionLineEditTableProps) => {
  const t = useTranslation();
  const { format } = useFormatNumber();
  const { draftLines, allocateIn, item, manualAllocate } = useAllocationContext(
    state => ({
      ...state,
      allocatedQuantity: getAllocatedQuantity(state),
    })
  );

  const allocate = (key: string, value: number) => {
    const num = Number.isNaN(value) ? 0 : value;
    return manualAllocate(key, num, format, t);
  };

  const columns = usePrescriptionLineEditColumns({
    allocate,
    item,
    allocateIn: allocateIn.type,
    disabled,
  });

  return (
    <Box style={{ width: '100%' }}>
      <Divider margin={10} />
      <Box
        sx={{
          maxHeight: '300px',
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'hidden',
          overflowY: 'auto',
          '& .MuiTableRow-root': {
            backgroundColor: 'background.toolbar',
          },
          '& .MuiTableRow-root:nth-of-type(even)': {
            backgroundColor: 'background.row',
          },
        }}
      >
        {!!draftLines.length && (
          <DataTable
            id="prescription-line-edit"
            columns={columns}
            data={draftLines}
            isDisabled={disabled}
            dense
          />
        )}
      </Box>
    </Box>
  );
};
