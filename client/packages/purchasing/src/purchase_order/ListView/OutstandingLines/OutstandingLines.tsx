import React, { useMemo } from 'react';
import {
  useNavigate,
  TableProvider,
  createTableStore,
  useTranslation,
  NothingHere,
  useUrlQueryParams,
  PurchaseOrderLineStatusNode,
  RouteBuilder,
  ColumnDef,
  ColumnType,
  usePaginatedMaterialTable,
  MaterialTable,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { PurchaseOrderLineFragment } from '../../api/operations.generated';
import { usePurchaseOrderLineList } from '../../api/hooks/usePurchaseOrderLineList';
import { AppBarButtons } from './AppBarButtons';

const OutstandingLinesList = () => {
  const t = useTranslation();
  const navigate = useNavigate();

  const {
    queryParams: { first, offset, sortBy },
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

  const mrtColumns = useMemo(
    (): ColumnDef<PurchaseOrderLineFragment>[] => [
      {
        header: t('label.purchase-order-number'),
        accessorKey: 'purchaseOrderNumber',
      },
      {
        header: t('label.purchase-order-reference'),
        accessorKey: 'purchaseOrderReference',
      },
      {
        header: t('label.created-by'),
        accessorKey: 'createdBy',
      },
      {
        header: t('label.supplier-code'),
        accessorKey: 'supplierCode',
      },
      {
        header: t('label.supplier-name'),
        accessorKey: 'supplierName',
      },
      {
        header: t('label.item-name'),
        accessorKey: 'itemName',
      },
      {
        header: t('label.purchase-order-confirmed'),
        accessorKey: 'confirmedDatetime',
        columnType: ColumnType.Date,
      },
      {
        header: t('label.expected-delivery-date'),
        accessorKey: 'expectedDeliveryDate',
        columnType: ColumnType.Date,
      },
      {
        header: t('label.adjusted-units-expected'),
        accessorKey: 'adjustedNumberOfUnits',
        columnType: ColumnType.Number,
      },
      {
        header: t('label.received-units'),
        accessorKey: 'receivedNumberOfUnits',
        columnType: ColumnType.Number,
      },
      {
        header: t('label.outstanding-units'),
        accessorKey: 'outstandingQuantity',
        columnType: ColumnType.Number,
        accessorFn: row => {
          const adjusted = row?.adjustedNumberOfUnits ?? 0;
          const received = row?.receivedNumberOfUnits ?? 0;
          return adjusted - received;
        },
      },
    ],
    []
  );

  const { table } = usePaginatedMaterialTable<PurchaseOrderLineFragment>({
    tableId: 'outstanding-purchase-order-lines-list',
    isLoading: isLoading,
    isError,
    onRowClick: row =>
      navigate(
        RouteBuilder.create(AppRoute.Replenishment)
          .addPart(AppRoute.PurchaseOrder)
          .addPart(row.purchaseOrder?.id ?? '')
          .build()
      ),
    columns: mrtColumns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    initialSort: { key: 'invoiceNumber', dir: 'desc' },
    noDataElement: (
      <NothingHere body={t('message.no-outstanding-purchase-order-lines')} />
    ),
  });

  return (
    <>
      <AppBarButtons data={data?.nodes} isLoading={isLoading} />
      <MaterialTable table={table} />
    </>
  );
};

export const OutstandingPurchaseOrderLinesListView = () => (
  <TableProvider createStore={createTableStore}>
    <OutstandingLinesList />
  </TableProvider>
);
