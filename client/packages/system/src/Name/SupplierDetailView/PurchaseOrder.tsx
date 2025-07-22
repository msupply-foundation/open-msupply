import React, { ReactElement } from 'react';
import {
  Box,
  createTableStore,
  DataTable,
  NothingHere,
  TableProvider,
  useColumns,
  useTranslation,
} from '@openmsupply-client/common';

// TODO:
// This is still to be connected to the backend
// Column definitions and data are placeholders
// Labels are placeholders and should be replaced with actual translations

export const PurchaseOrder = (): ReactElement => {
  const t = useTranslation();

  const columns = useColumns(
    [
      {
        key: 'orderNumber',
        label: 'Order Number',
      },
      {
        key: 'status',
        label: 'Status',
      },
      {
        key: 'date',
        label: 'Date',
      },
      {
        key: 'lock',
        label: 'Lock',
      },
      {
        key: 'targetDays',
        label: 'Target Days',
      },
      {
        key: 'lines',
        label: 'Lines',
      },
      {
        key: 'comment',
        label: 'Comment',
      },
    ],
    {
      sortBy: { key: 'orderDate', direction: 'desc' },
    }
  );

  return (
    <TableProvider createStore={createTableStore}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          flex: 1,
        }}
      >
        <DataTable
          id="supplier-purchase-order"
          columns={columns}
          data={[]}
          noDataElement={<NothingHere body={t('error.no-purchase-orders')} />}
        />
      </Box>
    </TableProvider>
  );
};
