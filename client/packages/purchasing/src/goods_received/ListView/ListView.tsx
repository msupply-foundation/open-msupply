import React, { useMemo } from 'react';
import {
  useNavigate,
  useTranslation,
  NothingHere,
  useUrlQueryParams,
  MaterialTable,
  usePaginatedMaterialTable,
  ColumnDef,
  ColumnType,
  useIsGapsStoreOnly,
  MobileCardList,
} from '@openmsupply-client/common';
import { useGoodsReceivedList } from '../api';
import { GoodsReceivedRowFragment } from '../api/operations.generated';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { Footer } from './Footer';
import { getGoodsReceivedStatusTranslator } from '../../utils';

export const GoodsReceivedListView = () => {
  const t = useTranslation();
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'createdDatetime', dir: 'desc' },
    filters: [
      { key: 'createdDatetime' },
      {
        key: 'status',
        condition: 'equalTo',
      },
    ],
  });

  const navigate = useNavigate();
  const {
    query: { data, isError, isLoading },
  } = useGoodsReceivedList(queryParams);

  const isMobile = useIsGapsStoreOnly();

  const columns = useMemo(
    (): ColumnDef<GoodsReceivedRowFragment>[] => [
      {
        accessorKey: 'supplier.name',
        header: t('label.supplier'),
        // enableSorting: false, // Will be true once added to sort enum
      },
      {
        id: 'status',
        accessorFn: row => getGoodsReceivedStatusTranslator(t)(row.status),
        header: t('label.status'),
        // enableSorting: false, // Will be true once sorting is added
      },
      {
        accessorKey: 'number',
        header: t('label.number'),
        columnType: ColumnType.Number,
        // enableSorting: false, // Will be true once sorting is added
      },
      {
        accessorKey: 'purchaseOrderNumber',
        header: t('label.purchase-order-number'),
        columnType: ColumnType.Number,
        // enableSorting: false,
      },
      {
        accessorKey: 'supplierReference',
        header: t('label.supplier-reference'),
        // enableSorting: false,
      },
      {
        accessorKey: 'createdDatetime',
        header: t('label.created'),
        accessorFn: row => row.createdDatetime,
        columnType: ColumnType.Date,
        enableSorting: true,
      },
      {
        accessorKey: 'receivedDatetime',
        header: t('label.received'),
        accessorFn: row => row.receivedDatetime ?? '',
        columnType: ColumnType.Date,
        // sortable: false,
      },
    ],
    []
  );

  const { table, selectedRows } =
    usePaginatedMaterialTable<GoodsReceivedRowFragment>({
      tableId: 'goods-received-list',
      data: data?.nodes,
      columns,
      totalCount: data?.totalCount ?? 0,
      isLoading,
      isError,
      onRowClick: row => {
        navigate(row.id);
      },
      noDataElement: <NothingHere body={t('error.no-items')} />,
    });

  return (
    <>
      <Toolbar />
      <AppBarButtons />
      {isMobile ? (
        <MobileCardList table={table} />
      ) : (
        <MaterialTable table={table} />
      )}
      <Footer
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
    </>
  );
};
