import React, { FC } from 'react';
import {
  useNavigate,
  DataTable,
  useColumns,
  TableProvider,
  createTableStore,
  useTranslation,
  NothingHere,
  useUrlQueryParams,
  GenericColumnKey,
} from '@openmsupply-client/common';
import { useGoodsReceivedList } from '../api';
import { GoodsReceivedRowFragment } from '../api/operations.generated';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { Footer } from './Footer';

// Helper function to format status
const getStatusTranslator =
  (t: ReturnType<typeof useTranslation>) => (status: unknown) => {
    const statusStr = String(status);
    switch (statusStr) {
      case 'NEW':
        return t('label.new');
      case 'CONFIRMED':
        return t('label.confirmed');
      case 'AUTHORISED':
        return t('label.authorised');
      case 'FINALISED':
        return t('label.finalised');
      default:
        return statusStr;
    }
  };

const ListView: FC = () => {
  const t = useTranslation();
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { page, first, offset, sortBy, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'createdDatetime', dir: 'desc' },
    filters: [
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
  } = useGoodsReceivedList(listParams);
  const pagination = { page, first, offset };

  const columns = useColumns<GoodsReceivedRowFragment>(
    [
      GenericColumnKey.Selection,
      {
        key: 'supplier',
        label: 'label.supplier',
        accessor: ({ rowData: _ }) => 'TODO: Add supplier to GraphQL', // rowData.supplier?.name
        sortable: false, // Will be true once added to GraphQL
      },
      {
        key: 'status',
        label: 'label.status',
        accessor: ({ rowData }) => rowData.status,
        formatter: getStatusTranslator(t),
        sortable: false, // Will be true once sorting is added
      },
      {
        key: 'number',
        label: 'label.number',
        maxWidth: 110,
        accessor: ({ rowData }) => rowData.number,
        sortable: false, // Will be true once sorting is added
      },
      {
        key: 'purchaseOrderNumber',
        label: 'label.purchase-order-number',
        accessor: ({ rowData: _ }) => 'TODO: Add PO number to GraphQL', // rowData.purchaseOrderNumber
        sortable: false,
      },
      {
        key: 'supplierReference',
        label: 'label.supplier-reference',
        accessor: ({ rowData: _ }) => 'TODO: Add supplier ref to GraphQL', // rowData.supplierReference
        sortable: false,
      },
      {
        key: 'createdDatetime',
        label: 'label.created',
        accessor: ({ rowData: _ }) => 'TODO: Add created date to GraphQL', // rowData.createdDatetime
        // format: ColumnFormat.Date, // Uncomment once field is added
        sortable: false, // Will be true once added (already in sort enum)
      },
      {
        key: 'receivedDatetime',
        label: 'label.received',
        accessor: ({ rowData: _ }) => 'TODO: Add received date to GraphQL', // rowData.receivedDatetime
        // format: ColumnFormat.Date, // Uncomment once field is added
        sortable: false,
      },
    ],
    { onChangeSortBy: updateSortQuery, sortBy },
    [sortBy]
  );

  return (
    <>
      <Toolbar />
      <AppBarButtons />
      <DataTable
        id="goods-received-list"
        enableColumnSelection
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes ?? []}
        isError={isError}
        isLoading={isLoading}
        noDataElement={<NothingHere body={t('error.no-purchase-orders')} />}
        onRowClick={row => {
          navigate(row.id);
        }}
      />
      <Footer listParams={listParams} />
    </>
  );
};

export const GoodsReceivedListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <ListView />
  </TableProvider>
);
