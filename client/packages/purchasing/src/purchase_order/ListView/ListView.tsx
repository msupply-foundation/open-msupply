import React, { useEffect, useMemo } from 'react';
import {
  useNavigate,
  TableProvider,
  createTableStore,
  useTranslation,
  useUrlQueryParams,
  PurchaseOrderNodeStatus,
  useTableStore,
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

const ListView = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { setDisabledRows } = useTableStore();
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
    query: { data, isLoading },
  } = usePurchaseOrderList(listParams);

  useEffect(() => {
    const disabledRows = (data?.nodes ?? [])
      .filter(row => row.status === PurchaseOrderNodeStatus.Finalised)
      .map(({ id }) => id);
    setDisabledRows(disabledRows);
  }, [data, setDisabledRows]);

  const mrtColumns = useMemo(
    (): ColumnDef<PurchaseOrderRowFragment>[] => [
      {
        header: t('label.supplier'),
        accessorKey: 'supplierName',
        enableColumnFilter: true,
        defaultHideOnMobile: true,
      },
      {
        header: t('label.number'),
        accessorKey: 'number',
        columnType: ColumnType.Number,
        size: 110,
      },
      {
        header: t('label.created'),
        accessorKey: 'createdDatetime',
        enableColumnFilter: true,
        columnType: ColumnType.Date,
      },
      {
        header: t('label.confirmed'),
        accessorKey: 'confirmedDatetime',
        enableColumnFilter: true,
        columnType: ColumnType.Date,
      },
      {
        header: t('label.sent'),
        accessorKey: 'sentDatetime',
        enableColumnFilter: true,
        columnType: ColumnType.Date,
      },
      {
        header: t('label.requested-delivery-date'),
        accessorKey: 'requestedDeliveryDate',
        enableColumnFilter: true,
        columnType: ColumnType.Date,
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
      },
      {
        header: t('label.target-months'),
        accessorKey: 'targetMonths',
        columnType: ColumnType.Number,
        accessorFn: row => row.targetMonths,
        defaultHideOnMobile: true,
      },
      {
        header: t('label.lines'),
        accessorFn: row => row.lines?.totalCount ?? 0,
        size: 80,
        enableSorting: false,
        defaultHideOnMobile: true,
      },
      {
        header: t('label.comment'),
        accessorKey: 'comment',
        columnType: ColumnType.Comment,
      },
    ],
    []
  );

  const { table, selectedRows } =
    usePaginatedMaterialTable<PurchaseOrderRowFragment>({
      tableId: 'purchase-order-list-view',
      isLoading,
      onRowClick: row => navigate(row.id),
      columns: mrtColumns,
      data: data?.nodes ?? [],
      totalCount: data?.totalCount ?? 0,
      initialSort: { key: 'invoiceNumber', dir: 'desc' },
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
        isLoading={isLoading}
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

export const PurchaseOrderListView = () => (
  <TableProvider createStore={createTableStore}>
    <ListView />
  </TableProvider>
);
