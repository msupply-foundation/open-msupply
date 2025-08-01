import React, { FC, useEffect } from 'react';
import {
  useNavigate,
  DataTable,
  useColumns,
  TableProvider,
  createTableStore,
  useTranslation,
  NothingHere,
  useUrlQueryParams,
  ColumnFormat,
  GenericColumnKey,
  PurchaseOrderNodeStatus,
  useTableStore,
} from '@openmsupply-client/common';
import { usePurchaseOrderList } from '../api';
import { PurchaseOrderRowFragment } from '../api/operations.generated';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { Footer } from './Footer';
import {
  DeliveryStatus,
  getDeliveryStatusTranslator,
  getStatusTranslator,
} from '../utils';

const ListView: FC = () => {
  const t = useTranslation();
  const { setDisabledRows } = useTableStore();
  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { page, first, offset, sortBy, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'createdDatetime', dir: 'desc' },
    filters: [
      { key: 'supplier' },
      { key: 'createdDatetime' },
      {
        key: 'status',
        condition: 'equalTo',
      },
    ],
  });
  const listParams = {
    sortBy,
    first,
    offset,
    filterBy,
  };

  const navigate = useNavigate();
  const {
    query: { data, isError, isLoading },
  } = usePurchaseOrderList(listParams);
  const pagination = { page, first, offset };

  useEffect(() => {
    const disabledRows = (data?.nodes ?? [])
      .filter(row => row.status !== PurchaseOrderNodeStatus.New)
      .map(({ id }) => id);
    setDisabledRows(disabledRows);
  }, [data, setDisabledRows]);

  const columns = useColumns<PurchaseOrderRowFragment>(
    [
      GenericColumnKey.Selection,
      {
        key: 'supplier',
        label: 'label.supplier',
        accessor: ({ rowData }) => rowData.supplier?.name,
        sortable: true,
      },
      [
        'invoiceNumber',
        {
          label: 'label.number',
          maxWidth: 110,
          accessor: ({ rowData }) => rowData.number,
        },
      ],
      {
        key: 'createdDatetime',
        label: 'label.created',
        format: ColumnFormat.Date,
        accessor: ({ rowData }) => rowData.createdDatetime,
        sortable: true,
      },
      {
        key: 'confirmedDatetime',
        label: 'label.confirmed',
        format: ColumnFormat.Date,
        accessor: ({ rowData }) => rowData.confirmedDatetime,
        sortable: true,
      },
      [
        'status',
        {
          formatter: status =>
            getStatusTranslator(t)(status as PurchaseOrderNodeStatus),
        },
      ],
      {
        key: 'deliveryStatus',
        label: 'label.delivery-status',
        accessor: ({}) => DeliveryStatus.NotDelivered, // Todo: Replace with actual delivery status calculation once we have goods received data (add rowData back)
        formatter: status =>
          getDeliveryStatusTranslator(t)(status as DeliveryStatus),
      },
      {
        key: 'expectedDeliveryDate',
        label: 'label.expected-delivery-date',
        format: ColumnFormat.Date,
        accessor: ({ rowData }) => rowData.expectedDeliveryDate,
        sortable: true,
      },
      {
        key: 'deliveryDatetime',
        label: 'label.delivered',
        accessor: ({ rowData: _ }) => '', // rowData.deliveredDatetime,
        // format: ColumnFormat.Date,
        // accessor: ({ rowData }) => rowData.deliveredDatetime,
        // TODO: Figure out how to get the delivery date from the goods received data
        sortable: true,
      },
      {
        key: 'lines',
        label: 'label.lines',
        accessor: ({ rowData }) => rowData.lines.totalCount,
        maxWidth: 80,
        sortable: false,
      },
      ['comment'],
    ],
    { onChangeSortBy: updateSortQuery, sortBy },
    [sortBy]
  );

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons />
      <DataTable
        id="purchase-order-list"
        enableColumnSelection
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes ?? []}
        isError={isError}
        isLoading={isLoading}
        noDataElement={
          <NothingHere
            body={t('error.no-purchase-orders')}
            // onCreate={modalController.toggleOn}
          />
        }
        onRowClick={row => {
          navigate(row.id);
        }}
      />
      <Footer listParams={listParams} />
    </>
  );
};

export const PurchaseOrderListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <ListView />
  </TableProvider>
);
