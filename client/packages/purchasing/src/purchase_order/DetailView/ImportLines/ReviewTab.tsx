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
} from '@openmsupply-client/common';
import { ImportRow } from './utils';
import { useBaseMaterialTable } from 'packages/common/src/ui/layout/tables/material-react-table/useBaseMaterialTable';

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
    (): ColumnDef<ImportRow>[] => {
      const columns: ColumnDef<ImportRow>[] = [
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
          size: 90,
          enableSorting: true,
          columnType: ColumnType.Number,
        },
        {
          accessorKey: 'numberOfPacks',
          header: t('label.requested-packs'),
          size: 90,
          enableSorting: true,
          columnType: ColumnType.Number,
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
          size: 90,
          enableSorting: true,
          columnType: ColumnType.Currency,
        },
        {
          accessorKey: 'discountPercentage',
          header: t('label.discount-percentage'),
          size: 90,
          enableSorting: true,
          columnType: ColumnType.Number,
        },
        {
          accessorKey: 'pricePerPackAfterDiscount',
          header: t('label.price-per-pack-after-discount'),
          size: 90,
          enableSorting: true,
          columnType: ColumnType.Currency,
        },
        {
          accessorKey: 'requestedDeliveryDate',
          header: t('label.requested-delivery-date'),
          size: 90,
          enableSorting: true,
          columnType: ColumnType.Date,
        },
        {
          accessorKey: 'expectedDeliveryDate',
          header: t('label.expected-delivery-date'),
          size: 90,
          enableSorting: true,
          columnType: ColumnType.Date,
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
      ];

      if (showWarnings) {
        columns.push({
          accessorKey: 'warningMessage',
          header: t('label.warning-message'),
          size: 150,
          Cell: TextWithTooltipCell,
        });
      } else {
        columns.push({
          accessorKey: 'errorMessage',
          header: t('label.error-message'),
          size: 200,
          Cell: TextWithTooltipCell,
        });
      }

      return columns;
    },
    []
  );

  const table = useBaseMaterialTable<ImportRow>({
    tableId: 'purchase-order-import-review-table',
    data: uploadedRows,
    columns,
    enableRowSelection: false,
    enablePagination: true,
    enableBottomToolbar: true,
    noDataElement: <NothingHere body={t('error.purchase-order-line-not-found')} />,
  });

  return (
    <ImportPanel tab={tab}>
      <Grid flexDirection="column" display="flex" gap={0} height={height * 0.5}>
        <MaterialTable table={table} />
      </Grid>
    </ImportPanel>
  );
};
