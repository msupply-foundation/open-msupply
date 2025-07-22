import React, { ReactElement } from 'react';
import {
  Box,
  ColumnDefinition,
  ColumnFormat,
  createTableStore,
  DataTable,
  NothingHere,
  PurchaseOrderNodeStatus,
  TableProvider,
  useColumns,
  useTranslation,
} from '@openmsupply-client/common';
import { PurchaseOrdersFragment } from '../apiModern/operations.generated';
import { usePurchaseOrders } from '../apiModern';
import { getStatusTranslator } from '../utils';

interface PurchaseOrderProps {
  supplierName: string;
}

export const PurchaseOrder = ({
  supplierName,
}: PurchaseOrderProps): ReactElement => {
  const t = useTranslation();
  const { data } = usePurchaseOrders(supplierName);

  const columnDefinitions: ColumnDefinition<PurchaseOrdersFragment>[] = [
    {
      key: 'supplier',
      label: 'label.supplier',
      accessor: ({ rowData }) => rowData.supplier?.name ?? '',
    },
    {
      key: 'orderNumber',
      label: 'label.number',
      accessor: ({ rowData }) => rowData.number ?? '',
    },
    {
      key: 'createdDatetime',
      label: 'label.created',
      format: ColumnFormat.Date,
      accessor: ({ rowData }) => rowData.createdDatetime ?? '',
    },
    {
      key: 'confirmationDate',
      label: 'label.confirmed',
      format: ColumnFormat.Date,
      accessor: ({ rowData }) => rowData.confirmedDatetime ?? '',
    },
    {
      key: 'status',
      label: 'label.status',
      accessor: ({ rowData }) => rowData.status ?? '',
      formatter: status =>
        getStatusTranslator(t)(status as PurchaseOrderNodeStatus),
    },
    {
      key: 'targetMonths',
      label: 'heading.target-months',
      accessor: ({ rowData }) => rowData.targetMonths ?? '',
    },
    {
      key: 'expectedDeliveryDate',
      label: 'label.expected-delivery-date',
      accessor: ({ rowData }) => rowData.expectedDeliveryDatetime ?? '',
    },
    {
      key: 'numberOfLines',
      label: 'label.lines',
      accessor: ({ rowData }) => rowData.lines.totalCount ?? '',
    },
    {
      key: 'comment',
      label: 'label.comment',
      accessor: ({ rowData }) => rowData.comment ?? '',
    },
  ];

  const columns = useColumns(columnDefinitions);

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
          data={data}
          noDataElement={<NothingHere body={t('error.no-purchase-orders')} />}
        />
      </Box>
    </TableProvider>
  );
};
