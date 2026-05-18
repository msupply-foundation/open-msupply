import React, { useMemo } from 'react';
import {
  useNavigate,
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
import { Toolbar } from './Toolbar';

export const OutstandingLinesListView = () => {
  const t = useTranslation();
  const navigate = useNavigate();

  const {
    queryParams: { first, offset, sortBy, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'purchaseOrderNumber', dir: 'desc' },
    filters: [
      { key: 'supplierName' },
      { key: 'purchaseOrderNumber', condition: 'equalTo', isNumber: true },
      { key: 'itemName' },
      { key: 'expectedDeliveryDate', condition: 'between' },
    ],
  });

  const listParams = {
    sortBy,
    first,
    offset,
    filterBy: {
      ...filterBy,
      status: { equalTo: PurchaseOrderLineStatusNode.Sent },
      receivedLessThanAdjusted: true,
    },
  };
  const {
    query: { data, isError, isLoading },
  } = usePurchaseOrderLineList(listParams);

  const columns = useMemo(
    (): ColumnDef<PurchaseOrderLineFragment>[] => [
      {
        header: t('label.purchase-order-number'),
        accessorKey: 'purchaseOrderNumber',
        accessorFn: row => row?.purchaseOrder?.number,
        enableSorting: true,
        enableColumnFilter: true,
        columnType: ColumnType.Number,
      },
      {
        header: t('label.purchase-order-reference'),
        accessorKey: 'purchaseOrder.reference',
      },
      {
        header: t('label.created-by'),
        accessorKey: 'createdBy',
        accessorFn: row => row?.purchaseOrder?.user?.username,
      },
      {
        header: t('label.supplier-code'),
        accessorKey: 'supplierCode',
        accessorFn: row => row?.purchaseOrder?.supplier?.code,
      },
      {
        header: t('label.supplier-name'),
        accessorKey: 'supplierName',
        accessorFn: row => row?.purchaseOrder?.supplier?.name,
        enableColumnFilter: true,
      },
      {
        header: t('label.item-name'),
        accessorKey: 'itemName',
        accessorFn: row => row.item.name,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        header: t('label.purchase-order-confirmed'),
        accessorKey: 'purchaseOrder.confirmedDatetime',
        columnType: ColumnType.Date,
      },
      {
        header: t('label.expected-delivery-date'),
        accessorKey: 'expectedDeliveryDate',
        columnType: ColumnType.Date,
        enableColumnFilter: true,
        dateFilterFormat: 'date',
      },
      {
        header: t('label.adjusted-units-expected'),
        accessorKey: 'adjustedNumberOfUnits',
        columnType: ColumnType.Number,
      },
      {
        header: t('label.shipped-units'),
        accessorKey: 'shippedNumberOfUnits',
        columnType: ColumnType.Number,
      },
      {
        header: t('label.outstanding-units'),
        accessorKey: 'outstandingQuantity',
        columnType: ColumnType.Number,
        accessorFn: row => {
          const adjusted = row?.adjustedNumberOfUnits ?? 0;
          const shipped = row?.shippedNumberOfUnits ?? 0;
          return adjusted - shipped;
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
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    initialSort: { key: 'invoiceNumber', dir: 'desc' },
    noDataElement: (
      <NothingHere body={t('message.no-outstanding-purchase-order-lines')} />
    ),
    enableRowSelection: false,
  });

  return (
    <>
      <Toolbar />
      <AppBarButtons data={data?.nodes} isLoading={isLoading} />
      <MaterialTable table={table} />
    </>
  );
};
