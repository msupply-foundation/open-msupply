import React, { useMemo } from 'react';
import {
  Grid,
  NothingHere,
  useTranslation,
  useWindowDimensions,
  ImportPanel,
  MaterialTable,
  ColumnDef,
  ColumnType,
  TextWithTooltipCell,
  useNonPaginatedMaterialTable,
} from '@openmsupply-client/common';
import { ImportRow } from './utils';

interface ReviewTabProps {
  uploadedRows: ImportRow[];
  tab: string;
  showWarnings: boolean;
}

export const ReviewTab = ({
  showWarnings,
  tab,
  uploadedRows,
}: ReviewTabProps) => {
  const t = useTranslation();
  const { height } = useWindowDimensions();

  const columns = useMemo(
    (): ColumnDef<ImportRow>[] => [
      {
        accessorKey: 'itemCode',
        header: t('label.code'),
        size: 90,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'requestedPackSize',
        header: t('label.pack-size'),
        columnType: ColumnType.Number,
        size: 90,
        enableSorting: true,
        enableColumnFilter: true,
        filterVariant: 'range-slider',
      },
      {
        accessorKey: 'numberOfPacks',
        header: t('label.requested-packs'),
        columnType: ColumnType.Number,
        size: 90,
        enableSorting: true,
        enableColumnFilter: true,
        filterVariant: 'range-slider',
      },
      {
        accessorKey: 'unit',
        header: t('label.unit'),
        size: 90,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'supplierItemCode',
        header: t('label.supplier-item-code'),
        size: 90,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'pricePerPackBeforeDiscount',
        header: t('label.price-per-pack-before-discount'),
        columnType: ColumnType.Currency,
        size: 90,
        enableSorting: true,
        enableColumnFilter: true,
        filterVariant: 'range-slider',
      },
      {
        accessorKey: 'discountPercentage',
        header: t('label.discount-percentage'),
        columnType: ColumnType.Number,
        size: 90,
        enableSorting: true,
        enableColumnFilter: true,
        filterVariant: 'range-slider',
      },
      {
        accessorKey: 'pricePerPackAfterDiscount',
        header: t('label.price-per-pack-after-discount'),
        size: 90,
        enableSorting: true,
        columnType: ColumnType.Currency,
        enableColumnFilter: true,
        filterVariant: 'range-slider',
      },
      {
        accessorKey: 'requestedDeliveryDate',
        header: t('label.requested-delivery-date'),
        columnType: ColumnType.Date,
        size: 90,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'expectedDeliveryDate',
        header: t('label.expected-delivery-date'),
        columnType: ColumnType.Date,
        size: 90,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'comment',
        header: t('label.comment'),
        size: 90,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'note',
        header: t('label.notes'),
        size: 90,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'warningMessage',
        header: t('label.warning-message'),
        includeColumn: showWarnings,
        size: 150,
        Cell: TextWithTooltipCell,
      },
      {
        accessorKey: 'errorMessage',
        header: t('label.error-message'),
        includeColumn: !showWarnings,
        size: 200,
        Cell: TextWithTooltipCell,
      },
    ],
    []
  );

  const { table } = useNonPaginatedMaterialTable<ImportRow>({
    tableId: 'purchase-order-import-review-table',
    data: uploadedRows,
    columns,
    enableRowSelection: false,
    noUrlFiltering: true,
    noDataElement: (
      <NothingHere body={t('error.purchase-order-line-not-found')} />
    ),
  });

  return (
    <ImportPanel tab={tab}>
      <Grid flexDirection="column" display="flex" gap={0} height={height * 0.5}>
        <MaterialTable table={table} />
      </Grid>
    </ImportPanel>
  );
};
