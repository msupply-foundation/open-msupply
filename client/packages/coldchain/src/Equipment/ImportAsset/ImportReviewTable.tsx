import React, { FC, useMemo } from 'react';
import {
  Grid,
  useIsCentralServerApi,
  useTranslation,
  useWindowDimensions,
  MaterialTable,
  ColumnDef,
  ColumnType,
  TextWithTooltipCell,
  useNonPaginatedMaterialTable,
  StatusCell,
} from '@openmsupply-client/common';
import { ImportRow } from './EquipmentImportModal';
import { fullStatusColorMap } from '../utils';

interface ImportReviewTableProps {
  importRows: ImportRow[];
  showWarnings: boolean;
  showErrors: boolean;
}
export const ImportReviewTable: FC<ImportReviewTableProps> = ({
  importRows,
  showWarnings,
  showErrors,
}) => {
  const t = useTranslation();
  const isCentralServer = useIsCentralServerApi();
  const { height } = useWindowDimensions();

  const columns = useMemo(
    (): ColumnDef<ImportRow>[] => [
      {
        id: 'storeCode',
        accessorFn: row => row.store?.code,
        size: 90,
        header: t('label.store'),
        includeColumn: isCentralServer,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'assetNumber',
        size: 90,
        header: t('label.asset-number'),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'catalogueItemCode',
        size: 150,
        header: t('label.catalogue-item-code'),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'installationDate',
        header: t('label.installation-date'),
        size: 120,
        columnType: ColumnType.Date,
        enableSorting: true,
      },
      {
        accessorKey: 'replacementDate',
        header: t('label.replacement-date'),
        size: 120,
        columnType: ColumnType.Date,
        enableSorting: true,
      },
      {
        accessorKey: 'warrantyStart',
        header: t('label.warranty-start-date'),
        size: 120,
        columnType: ColumnType.Date,
        enableSorting: true,
      },
      {
        accessorKey: 'warrantyEnd',
        header: t('label.warranty-end-date'),
        size: 120,
        columnType: ColumnType.Date,
        enableSorting: true,
      },
      {
        accessorKey: 'serialNumber',
        header: t('label.serial'),
        size: 100,
        Cell: TextWithTooltipCell,
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        id: 'status',
        accessorFn: row => row.status,
        header: t('label.status'),
        size: 100,
        Cell: ({ cell }) => (
          <StatusCell cell={cell} statusMap={fullStatusColorMap(t)} />
        ),
        enableColumnFilter: true,
        filterVariant: 'select',
      },
      {
        id: 'need-replacement',
        accessorFn: row => !!row.needsReplacement,
        header: t('label.needs-replacement'),
        size: 130,
        columnType: ColumnType.Boolean,
      },
      {
        accessorKey: 'notes',
        size: 160,
        header: t('label.asset-notes'),
        Cell: TextWithTooltipCell,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'warningMessage',
        header: t('label.warning-message'),
        size: 150,
        Cell: TextWithTooltipCell,
        includeColumn: showWarnings,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'errorMessage',
        header: t('label.error-message'),
        size: 150,
        Cell: TextWithTooltipCell,
        includeColumn: showErrors,
      },
    ],
    [showWarnings, showErrors, isCentralServer]
  );

  const { table } = useNonPaginatedMaterialTable<ImportRow>({
    tableId: 'import-equipment-review-table',
    data: importRows,
    columns,
    enableRowSelection: false,
    noUrlFiltering: true,
  });

  return (
    <Grid
      flexDirection="column"
      display="flex"
      gap={2}
      maxHeight={height * 0.6}
    >
      <MaterialTable table={table} />
    </Grid>
  );
};
