import React from 'react';
import {
  Divider,
  Box,
  MaterialTable,
  useTranslation,
  useFormatNumber,
  useSimpleMaterialTable,
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
  });

  const table = useSimpleMaterialTable({
    tableId: 'prescription-line-edit',
    columns,
    data: draftLines,
    getIsRestrictedRow: row => disabled || !!row.vvmStatus?.unusable,
    enableRowSelection: false,
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
        }}
      >
        {!!draftLines.length && <MaterialTable table={table} />}
      </Box>
    </Box>
  );
};
