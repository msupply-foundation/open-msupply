import React, { useMemo } from 'react';
import {
  ColumnDef,
  ColumnType,
  MaterialTable,
  NothingHere,
  TextWithTooltipCell,
  useNonPaginatedMaterialTable,
  useTranslation,
} from '@openmsupply-client/common';
import { GoodsReceivedLineFragment } from '../../api/operations.generated';

interface ContentAreaProps {
  lines: GoodsReceivedLineFragment[];
  isDisabled: boolean;
  onRowClick: null | ((line: GoodsReceivedLineFragment) => void);
}

export const ContentArea = ({
  lines,
  isDisabled,
  onRowClick,
}: ContentAreaProps) => {
  const t = useTranslation();

  const columns = useMemo(
    (): ColumnDef<GoodsReceivedLineFragment>[] => [
      {
        accessorKey: 'lineNumber',
        header: t('label.line-number'),
        columnType: ColumnType.Number,
        enableSorting: true,
      },
      {
        accessorKey: 'item.code',
        header: t('label.code'),
        size: 90,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'item.name',
        header: t('label.item-name'),
        Cell: TextWithTooltipCell,
        size: 300,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        size: 150,
      },
      {
        accessorKey: 'expiryDate',
        header: t('label.expiry-date'),
        columnType: ColumnType.Date,
        size: 150,
      },
      {
        accessorKey: 'receivedPackSize',
        header: t('label.pack-size'),
        columnType: ColumnType.Number,
        size: 150,
        defaultHideOnMobile: true,
      },
      {
        id: 'numberOfPacks',
        accessorFn: row =>
          Math.ceil(
            (row.numberOfPacksReceived ?? 0) /
            (row.receivedPackSize &&
              row.receivedPackSize !== 0 ? row.receivedPackSize : 1)
          ),
        header: t('label.num-packs'),
        columnType: ColumnType.Number,
        size: 150,
      },
    ],
    []
  );

  // TODO: Implement proper row selection when lines are implemented
  const { table } = useNonPaginatedMaterialTable<GoodsReceivedLineFragment>({
    tableId: 'goods-received-detail',
    columns,
    data: lines,
    enableRowSelection: !isDisabled,
    onRowClick: onRowClick ?? undefined,
    getIsPlaceholderRow: row => row.numberOfPacksReceived === 0,
    noDataElement: (
      <NothingHere
        body={t('error.no-purchase-order-items')}
        buttonText={t('button.add-item')}
        onCreate={isDisabled ? undefined : undefined}
      />
    ),
  });

  return <MaterialTable table={table} />;
};
