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
  ColumnFormat,
  LocaleKey,
  GoodsReceivedNodeStatus,
} from '@openmsupply-client/common';
import { useGoodsReceivedList } from '../api';
import { GoodsReceivedRowFragment } from '../api/operations.generated';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { Footer } from './Footer';

const statusTranslation: Record<GoodsReceivedNodeStatus, LocaleKey> = {
  NEW: 'label.new',
  CONFIRMED: 'label.confirmed',
  AUTHORISED: 'label.authorised',
  FINALISED: 'label.finalised',
};

// Helper function to format status
const getStatusTranslator =
  (t: ReturnType<typeof useTranslation>) =>
  (currentStatus: unknown): string => {
    const status = currentStatus as GoodsReceivedNodeStatus;
    return t(
      statusTranslation[status] ??
        statusTranslation[GoodsReceivedNodeStatus.New]
    );
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
        accessor: ({ rowData }) => rowData.supplier?.name ?? '',
        sortable: false, // Will be true once added to sort enum
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
        accessor: ({ rowData }) => rowData.purchaseOrderNumber?.toString() ?? '',
        sortable: false,
      },
      {
        key: 'supplierReference',
        label: 'label.supplier-reference',
        accessor: ({ rowData }) => rowData.supplierReference ?? '',
        sortable: false,
      },
      {
        key: 'createdDatetime',
        label: 'label.created',
        accessor: ({ rowData }) => rowData.createdDatetime,
        format: ColumnFormat.Date,
        sortable: true, // Available in sort enum
      },
      {
        key: 'receivedDatetime',
        label: 'label.received',
        accessor: ({ rowData }) => rowData.receivedDatetime ?? '',
        format: ColumnFormat.Date,
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
