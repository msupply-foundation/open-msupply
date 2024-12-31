import React from 'react';
import {
  Box,
  createTableStore,
  DataTable,
  TableProvider,
  TooltipTextCell,
  useColumns,
  useTranslation,
} from '@openmsupply-client/common';
import { CustomerIndicatorInfoFragment } from '../../api';

interface CustomerIndicatorInfoProps {
  customerInfos?: CustomerIndicatorInfoFragment[] | null;
  storeNameId?: string;
}

const CustomerIndicatorInfo = ({
  customerInfos,
  storeNameId,
}: CustomerIndicatorInfoProps) => {
  const t = useTranslation();

  const columns = useColumns<CustomerIndicatorInfoFragment>([
    [
      'name',
      {
        sortable: false,
        accessor: ({ rowData }) =>
          rowData.id === storeNameId
            ? `(${t('label.this-store')}) ${rowData?.id}`
            : rowData?.customer.name,
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
  <Box maxHeight={200} width="100%" borderRadius={3} overflow="auto">
    <TableProvider createStore={createTableStore}>
      <CustomerIndicatorInfo
        customerInfos={customerInfos}
        storeNameId={storeNameId}
      />
    </TableProvider>
  </Box>
);
