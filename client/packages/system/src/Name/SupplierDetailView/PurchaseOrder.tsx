import React, { ReactElement, useMemo } from 'react';
import {
  ColumnDef,
  ColumnType,
  MaterialTable,
  NothingHere,
  PurchaseOrderNodeStatus,
  RouteBuilder,
  useNavigate,
  useNonPaginatedMaterialTable,
  useTranslation,
} from '@openmsupply-client/common';
import { PurchaseOrdersFragment } from '../apiModern/operations.generated';
import { usePurchaseOrders } from '../apiModern';
import { getStatusTranslator } from '../utils';
import { AppRoute } from '@openmsupply-client/config';

interface PurchaseOrderProps {
  supplierName: string;
}

export const PurchaseOrder = ({
  supplierName,
}: PurchaseOrderProps): ReactElement => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { data } = usePurchaseOrders(supplierName);

  const columns = useMemo(
    (): ColumnDef<PurchaseOrdersFragment>[] => [
      {
        accessorKey: 'number',
        header: t('label.number'),
      },
      {
        accessorKey: 'createdDatetime',
        header: t('label.created'),
        columnType: ColumnType.Date,
      },
      {
        accessorKey: 'confirmedDatetime',
        header: t('label.confirmed'),
        columnType: ColumnType.Date,
      },
      {
        id: 'status',
        accessorFn: row => getStatusTranslator(t)(row.status as PurchaseOrderNodeStatus),
        header: t('label.status'),
      },
      {
        accessorKey: 'targetMonths',
        header: t('label.target-months'),
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'lines.totalCount',
        header: t('label.lines'),
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'comment',
        header: t('label.comment'),
      },
    ],
    []
  );

  const { table } = useNonPaginatedMaterialTable<PurchaseOrdersFragment>({
    tableId: 'supplier-purchase-order',
    data,
    columns,
    enableRowSelection: false,
    onRowClick: row =>
      navigate(
        RouteBuilder.create(AppRoute.Replenishment)
          .addPart(AppRoute.PurchaseOrder)
          .addPart(row.id)
          .build()
      ),
    noDataElement: <NothingHere body={t('error.no-purchase-orders')} />,
  })

  return <MaterialTable table={table} />;
};
