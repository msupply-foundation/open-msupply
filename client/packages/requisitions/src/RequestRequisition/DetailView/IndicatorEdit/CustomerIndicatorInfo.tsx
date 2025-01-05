import React from 'react';
import {
  Box,
  createTableStore,
  DataTable,
  TableProvider,
  TooltipTextCell,
  useColumns,
} from '@openmsupply-client/common';
import { CustomerIndicatorInfoFragment } from '../../api';

interface CustomerIndicatorInfoProps {
  customerInfos?: CustomerIndicatorInfoFragment[] | null;
  storeNameId?: string;
}

const CustomerIndicatorInfo = ({
  customerInfos,
}: CustomerIndicatorInfoProps) => {
  const columns = useColumns<CustomerIndicatorInfoFragment>([
    [
      'name',
      {
        sortable: false,
        accessor: ({ rowData }) => rowData?.customer.name,
        width: 240,
        Cell: TooltipTextCell,
      },
    ],
  ]);

  return (
    <DataTable
      id="item-information"
      columns={columns}
      data={customerInfos ?? []}
      dense
    />
  );
};

export const CustomerIndicatorInfoView = ({
  customerInfos,
  storeNameId,
}: CustomerIndicatorInfoProps) => (
  <Box
    width="100%"
    borderRadius={3}
    sx={{
      display: 'flex',
      flex: '1 1 0%',
      overflowY: 'auto',
    }}
  >
    <TableProvider createStore={createTableStore}>
      <CustomerIndicatorInfo
        customerInfos={customerInfos}
        storeNameId={storeNameId}
      />
    </TableProvider>
  </Box>
);
