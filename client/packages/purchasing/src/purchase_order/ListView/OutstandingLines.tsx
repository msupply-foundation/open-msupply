import React from 'react';
import {
  useNavigate,
  DataTable,
  useColumns,
  TableProvider,
  createTableStore,
  useTranslation,
  NothingHere,
  useUrlQueryParams,
  PurchaseOrderLineStatusNode,
  useFormatDateTime,
  ColumnFormat,
  NumberCell,
  RouteBuilder,
} from '@openmsupply-client/common';
import { PurchaseOrderLineFragment } from '../api/operations.generated';
import { usePurchaseOrderLineList } from '../api/hooks/usePurchaseOrderLineList';
import { AppRoute } from 'packages/config/src';

const OutstandingLinesList = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { localisedDate } = useFormatDateTime();

  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { page, first, offset, sortBy },
  } = useUrlQueryParams({
    initialSort: { key: 'purchaseOrderNumber', dir: 'desc' },
  });

  const listParams = {
    sortBy,
    first,
    offset,
    filterBy: {
      status: { equalTo: PurchaseOrderLineStatusNode.Sent },
      receivedLessThanAdjusted: true,
    },
  };
  const {
    query: { data, isError, isLoading },
  } = usePurchaseOrderLineList(listParams);
  const pagination = { page, first, offset };

  const columns = useColumns<PurchaseOrderLineFragment>(
    [
      {
        key: 'purchaseOrderNumber',
        label: 'label.purchase-order-number',
        accessor: ({ rowData }) => rowData?.purchaseOrder?.number,
      },
      {
        key: 'purchaseOrderReference',
        label: 'label.purchase-order-reference',
        accessor: ({ rowData }) => rowData?.purchaseOrder?.reference,
        sortable: false,
      },
      {
        key: 'supplierCode',
        label: 'label.supplier-code',
        accessor: ({ rowData }) => rowData?.purchaseOrder?.supplier?.code,
        sortable: false,
      },
      {
        key: 'supplierName',
        label: 'label.supplier-name',
        accessor: ({ rowData }) => rowData?.purchaseOrder?.supplier?.name,
        sortable: false,
      },
      {
        key: 'itemName',
        label: 'label.item-name',
        accessor: ({ rowData }) => rowData?.item?.name,
        sortable: false,
      },
      {
        key: 'confirmedDatetime',
        label: 'label.purchase-order-confirmed',
        formatter: dateString =>
          dateString ? localisedDate((dateString as string) || '') : '',
        accessor: ({ rowData }) => rowData?.purchaseOrder?.confirmedDatetime,
      },
      {
        key: 'expectedDeliveryDate',
        label: 'label.expected-delivery-date',
        format: ColumnFormat.Date,
        sortable: false,
      },
      {
        key: 'adjustedNumberOfUnits',
        label: 'label.adjusted-quantity-expected',
        Cell: NumberCell,
        sortable: false,
      },
      {
        key: 'receivedNumberOfUnits',
        label: 'label.received-units',
        Cell: NumberCell,
        sortable: false,
      },
      {
        key: 'outstandingQuantity',
        label: 'label.outstanding-units',
        Cell: NumberCell,
        accessor: ({ rowData }) => {
          const adjusted = rowData?.adjustedNumberOfUnits ?? 0;
          const received = rowData?.receivedNumberOfUnits ?? 0;
          return adjusted - received;
        },
      },
    ],
    { onChangeSortBy: updateSortQuery, sortBy },
    [sortBy]
  );

  return (
    <>
      <DataTable
        id="outstanding-purchase-order-lines"
        enableColumnSelection
        columns={columns}
        data={data?.nodes ?? []}
        isError={isError}
        isLoading={isLoading}
        onRowClick={row =>
          navigate(
            RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.PurchaseOrder)
              .addPart(row.purchaseOrder?.id ?? '')
              .build()
          )
        }
        onChangePage={updatePaginationQuery}
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        noDataElement={
          <NothingHere
            body={t('message.no-outstanding-purchase-order-lines')}
          />
        }
      />
    </>
  );
};

export const OutstandingPurchaseOrderLinesListView = () => (
  <TableProvider createStore={createTableStore}>
    <OutstandingLinesList />
  </TableProvider>
);
