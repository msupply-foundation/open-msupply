import React, { useMemo } from 'react';
import {
  NothingHere,
  useNavigate,
  useParams,
  useTranslation,
  RouteBuilder,
  ColumnDef,
  ColumnType,
  GoodsReceivedNodeStatus,
  useNonPaginatedMaterialTable,
  MaterialTable,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import {
  useGoodsReceivedList,
  GoodsReceivedRowFragment,
} from '../../../goods_received/api';
import { getGoodsReceivedStatusTranslator } from '../../../utils';

export const GoodsReceived = () => {
  const t = useTranslation();
  const { purchaseOrderId } = useParams();
  const navigate = useNavigate();

  const {
    query: { data, isFetching },
  } = useGoodsReceivedList({
    filterBy: { purchaseOrderId: { equalTo: purchaseOrderId } },
  });

  const columns = useMemo(
    (): ColumnDef<GoodsReceivedRowFragment>[] => [
      {
        header: t('label.number'),
        accessorKey: 'number',
        columnType: ColumnType.Number,
        size: 60,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        header: t('label.supplier'),
        accessorKey: 'supplier.name',
      },
      {
        header: t('label.status'),
        id: 'status',
        size: 120,
        accessorFn: row => getGoodsReceivedStatusTranslator(t)(row.status),
        filterVariant: 'select',
        filterSelectOptions: Object.values(GoodsReceivedNodeStatus).map(
          status => ({
            value: status,
            label: getGoodsReceivedStatusTranslator(t)(status),
          })
        ),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        header: t('label.supplier-reference'),
        accessorKey: 'supplierReference',
      },
      {
        header: t('label.created'),
        accessorKey: 'createdDatetime',
        columnType: ColumnType.Date,
        enableSorting: true,
        size: 100,
      },
      {
        header: t('label.received'),
        accessorKey: 'receivedDatetime',
        columnType: ColumnType.Date,
        enableSorting: true,
        size: 100,
      },
    ],
    []
  );

  const handleRowClick = (row: GoodsReceivedRowFragment) => {
    const path = RouteBuilder.create(AppRoute.Replenishment)
      .addPart(AppRoute.GoodsReceived)
      .addPart(row.id)
      .build();
    navigate(path);
  };

  const { table } = useNonPaginatedMaterialTable<GoodsReceivedRowFragment>({
    tableId: 'goods-received-list-in-purchase-order',
    isLoading: isFetching,
    onRowClick: handleRowClick,
    columns,
    data: data?.nodes,
    initialSort: { key: 'createdDatetime', dir: 'desc' },
    enableRowSelection: false,
    noDataElement: <NothingHere body={t('error.no-goods-received-linked')} />,
  });

  return <MaterialTable table={table} />;
};
