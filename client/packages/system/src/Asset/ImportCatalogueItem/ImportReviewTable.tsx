import React, { FC, useMemo } from 'react';
import {
  Grid,
  NothingHere,
  TextWithTooltipCell,
  useTranslation,
  useWindowDimensions,
  MaterialTable,
  useNonPaginatedMaterialTable,
  ColumnDef,
} from '@openmsupply-client/common';
import { ImportRow } from './CatalogueItemImportModal';

interface ImportReviewTableProps {
  importRows: ImportRow[];
}
export const ImportReviewTable: FC<ImportReviewTableProps> = ({
  importRows,
}) => {
  const t = useTranslation();
  const { height } = useWindowDimensions();

  const columns = useMemo(
    (): ColumnDef<ImportRow>[] => [
      {
        accessorKey: 'subCatalogue',
        header: t('label.sub-catalogue'),
        size: 70,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'code',
        header: t('label.code'),
        size: 50,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'type',
        header: t('label.type'),
        size: 100,
        Cell: TextWithTooltipCell,
        enableSorting: true,
        enableColumnFilter: true,
        filterVariant: 'select',
      },
      {
        accessorKey: 'manufacturer',
        header: t('label.manufacturer'),
        size: 100,
        Cell: TextWithTooltipCell,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'model',
        header: t('label.model'),
        size: 100,
        Cell: TextWithTooltipCell,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'class',
        header: t('label.class'),
        size: 100,
        Cell: TextWithTooltipCell,
        enableSorting: true,
        enableColumnFilter: true,
        filterVariant: 'select',
      },
      {
        accessorKey: 'category',
        header: t('label.category'),
        size: 100,
        Cell: TextWithTooltipCell,
        enableSorting: true,
        enableColumnFilter: true,
        filterVariant: 'select',
      },
      {
        accessorKey: 'errorMessage',
        header: t('label.error-message'),
        size: 150,
        Cell: TextWithTooltipCell,
      },
    ],
    []
  );

  const { table } = useNonPaginatedMaterialTable<ImportRow>({
    tableId: 'asset-import-review-table',
    data: importRows,
    columns,
    enableRowSelection: false,
    noUriFiltering: true,
    noDataElement: <NothingHere body={t('error.asset-not-found')} />,
  });

  return (
    <Grid flexDirection="column" display="flex" gap={0} height={height * 0.5}>
      <MaterialTable table={table} />
    </Grid>
  );
};
