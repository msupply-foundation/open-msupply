import React from 'react';
import {
  Divider,
  Box,
  DataTable,
  useTranslation,
  useTableStore,
  useFormatNumber,
} from '@openmsupply-client/common';

import { usePrescriptionLineEditRows } from './hooks';
import { usePrescriptionLineEditColumns } from './columns';
import { CurrencyRowFragment } from '@openmsupply-client/system';
import { useOutboundLineEditColumns } from '../../OutboundShipment/DetailView/OutboundLineEdit/columns';
import { getAllocatedQuantity } from '../../Allocation/utils';
import { useAllocationContext } from '../../Allocation/useAllocationContext';

export interface PrescriptionLineEditTableProps {
  currency?: CurrencyRowFragment | null;
  isExternalSupplier: boolean;
  disabled?: boolean;
}

export const PrescriptionLineEditTable: React.FC<
  PrescriptionLineEditTableProps
> = ({ currency, isExternalSupplier, disabled }) => {
  const t = useTranslation();
  const { format } = useFormatNumber();
  // const tableStore = useTableStore(); Only used for disabling rows?
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

  const columns = useOutboundLineEditColumns({
    allocate,
    item,
    currency,
    isExternalSupplier,
    allocateIn,
  });

  // TODO: MOVE TO THIS from above
  // const columns = usePrescriptionLineEditColumns({
  //   onChange: onEditStockLine,
  //   unitName,
  //   isVaccine: item?.isVaccine,
  // });

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
            dense
          />
        )}
      </Box>
    </Box>
  );
};
