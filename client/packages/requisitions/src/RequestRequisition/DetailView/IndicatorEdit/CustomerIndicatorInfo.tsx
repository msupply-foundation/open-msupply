import React, { useMemo } from 'react';
import {
  Box,
  ColumnDef,
  ColumnType,
  MaterialTable,
  useSimpleMaterialTable,
  useTranslation,
} from '@openmsupply-client/common';
import {
  CustomerIndicatorInfoFragment,
  IndicatorColumnFragment,
} from '../../api';
import { indicatorColumnNameToLocal } from '../../../utils';

interface CustomerIndicatorInfoProps {
  columns: IndicatorColumnFragment[];
  customerInfos?: CustomerIndicatorInfoFragment[];
}

export const CustomerIndicatorInfoView = ({
  columns,
  customerInfos,
}: CustomerIndicatorInfoProps) => {
  const t = useTranslation();
  const columnsDefs = useMemo(
    (): ColumnDef<CustomerIndicatorInfoFragment>[] => [
      {
        accessorKey: 'customer.name',
        header: t('label.name'),
      },
      ...columns.map(
        ({ id, name }): ColumnDef<CustomerIndicatorInfoFragment> => ({
          id,
          header: indicatorColumnNameToLocal(name, t),
          accessorFn: row =>
            row.indicatorInformation.find(i => i.columnId === id)?.value || '',
        })
      ),
      {
        accessorKey: 'datetime',
        header: t('label.date'),
        columnType: ColumnType.Date,
      },
    ],
    [columns]
  );

  const table = useSimpleMaterialTable({
    tableId: 'customer-indicator-info',
    columns: columnsDefs,
    data: customerInfos,
    enableBottomToolbar: false,
    initialState: {
      density: 'comfortable',
    },
  });

  return (
    <Box sx={{ flex: '1 1 0%', overflowY: 'auto' }}>
      <MaterialTable table={table} />
    </Box>
  );
};
