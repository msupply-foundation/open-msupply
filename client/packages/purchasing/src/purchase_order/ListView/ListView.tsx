import React, { useMemo } from 'react';
import {
  useNavigate,
  useTranslation,
  useUrlQueryParams,
  PurchaseOrderNodeStatus,
  useToggle,
  ColumnType,
  ColumnDef,
  usePaginatedMaterialTable,
  MaterialTable,
  NothingHere,
} from '@openmsupply-client/common';
import { usePurchaseOrderList } from '../api';
import { PurchaseOrderRowFragment } from '../api/operations.generated';
import { AppBarButtons } from './AppBarButtons';
import { Footer } from './Footer';
import {
  getPurchaseOrderStatusTranslator,
  isPurchaseOrderDisabled,
} from '../../utils';

export const PurchaseOrderListView = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const modalController = useToggle();

  const {
    queryParams: { first, offset, sortBy, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'createdDatetime', dir: 'desc' },
    filters: [
      { key: 'supplier' },
      {
        key: 'status',
        condition: 'equalTo',
      },
      { key: 'createdDatetime', condition: 'between' },
      { key: 'confirmedDatetime', condition: 'between' },
      { key: 'requestedDeliveryDate', condition: 'between' },
      { key: 'sentDatetime', condition: 'between' },
    ],
  });

  const listParams = {
    sortBy,
    first,
    offset,
    filterBy,
  };
  const {
    query: { data, isFetching },
  } = usePurchaseOrderList(listParams);

  const columns = useMemo(
    (): ColumnDef<PurchaseOrderRowFragment>[] => [
      {
        header: t('label.supplier'),
        id: 'supplier',
        accessorFn: row => row.supplier?.name,
        enableColumnFilter: true,
        defaultHideOnMobile: true,
      },
      {
        header: t('label.number'),
        accessorKey: 'number',
        columnType: ColumnType.Number,
        size: 90,
        enableSorting: true,
      },
      {
        header: t('label.created'),
        accessorKey: 'createdDatetime',
        columnType: ColumnType.Date,
        enableSorting: true,
        enableColumnFilter: true,
        size: 100,
      },
      {
        header: t('label.confirmed'),
        accessorKey: 'confirmedDatetime',
        enableColumnFilter: true,
        columnType: ColumnType.Date,
        size: 100,
      },
      {
        header: t('label.sent'),
        accessorKey: 'sentDatetime',
        enableColumnFilter: true,
        columnType: ColumnType.Date,
        size: 100,
      },
      {
        header: t('label.requested-delivery-date'),
        accessorKey: 'requestedDeliveryDate',
        columnType: ColumnType.Date,
        enableColumnFilter: true,
        dateFilterFormat: 'date',
        size: 100,
      },
      {
        header: t('label.status'),
        accessorFn: row => getPurchaseOrderStatusTranslator(t)(row.status),
        id: 'status',
        size: 140,
        filterVariant: 'select',
        filterSelectOptions: Object.values(PurchaseOrderNodeStatus).map(
          status => ({
            value: status,
            label: getPurchaseOrderStatusTranslator(t)(status),
          })
        ),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        header: t('label.target-months'),
        accessorKey: 'targetMonths',
        columnType: ColumnType.Number,
        accessorFn: row => row.targetMonths,
        defaultHideOnMobile: true,
        size: 90,
      },
      {
        header: t('label.lines'),
        accessorFn: row => row.lines?.totalCount ?? 0,
        size: 80,
        defaultHideOnMobile: true,
        columnType: ColumnType.Number,
      },
      {
        header: t('label.comment'),
        accessorKey: 'comment',
        columnType: ColumnType.Comment,
        enableSorting: true,
      },
    ],
    []
  );

  const { table, selectedRows } =
    usePaginatedMaterialTable<PurchaseOrderRowFragment>({
      tableId: 'purchase-order-list-view',
      isLoading: isFetching,
      onRowClick: row => navigate(row.id),
      columns,
      data: data?.nodes ?? [],
      totalCount: data?.totalCount ?? 0,
      initialSort: { key: 'number', dir: 'desc' },
      getIsRestrictedRow: isPurchaseOrderDisabled,
      noDataElement: (
        <NothingHere
          body={t('error.no-purchase-orders')}
          onCreate={modalController.toggleOn}
        />
      ),
    });

  return (
    <>
      <AppBarButtons
        data={data?.nodes}
        isLoading={isFetching}
        modalController={modalController}
        onCreate={modalController.toggleOn}
      />
      <MaterialTable table={table} />

      <Footer
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
    </>
  );
};
