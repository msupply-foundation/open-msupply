import React, { FC, useMemo } from 'react';
import {
  Grid,
  LocaleKey,
  NamePropertyNode,
  PropertyNode,
  useTranslationExistsInLocale,
  useTranslation,
  MaterialTable,
  useNonPaginatedMaterialTable,
  ColumnDef,
  TextWithTooltipCell,
} from '@openmsupply-client/common';
import { ImportRow } from './PropertiesImportModal';

interface ImportReviewTableProps {
  rows: ImportRow[];
  properties: NamePropertyNode[] | undefined;
}

export const ImportReviewTable: FC<ImportReviewTableProps> = ({
  rows,
  properties,
}) => {
  const t = useTranslation();

  // Could filter here for only properties that are used in import
  const propertyNodes: PropertyNode[] | undefined = properties
    ?.map(property => {
      return { ...property.property };
    })
    .sort();

  const columns = useMemo(
    (): ColumnDef<ImportRow>[] => [
      {
        accessorKey: 'code',
        header: t('label.code'),
        size: 80,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'name',
        header: t('label.name'),
        size: 150,
        Cell: TextWithTooltipCell,
        enableSorting: true,
        enableColumnFilter: true,
      },
      ...((propertyNodes?.map(property => {
        const t = useTranslation();
        const labelExistsInLocale = useTranslationExistsInLocale(property.name);
        const header = labelExistsInLocale
          ? t(property.name as LocaleKey, { defaultValue: property.name })
          : property.name;
        return {
          accessorKey: property.key,
          header,
          size: 150,
          Cell: TextWithTooltipCell,
          enableSorting: true,
        };
      })) || []),
      {
        accessorKey: 'errorMessage',
        header: t('label.error-message'),
        size: 150,
        Cell: TextWithTooltipCell,
        enableSorting: true,
        enableColumnFilter: true,
      },
    ],
    [propertyNodes]
  );

  const rowsWithProperties = rows.map(row => {
    return { ...row, ...row.properties };
  });

  const { table } = useNonPaginatedMaterialTable<ImportRow>({
    tableId: 'import-name-properties-review-table',
    data: rowsWithProperties,
    columns,
    enableRowSelection: false,
    noUriFiltering: true,
  });

  const tableHeight = window.innerHeight - 360;

  return (
    <Grid
      flexDirection="column"
      display="flex"
      gap={0}
      height={`${tableHeight}px`}
      minHeight="350px"
      maxHeight="700px"
    >
      <MaterialTable table={table} />
    </Grid>
  );
};
