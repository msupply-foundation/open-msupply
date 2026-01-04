import React, { FC, useMemo, useState } from 'react';
import {
  Grid,
  SearchBar,
  useIsCentralServerApi,
  useTranslation,
  useWindowDimensions,
  MaterialTable,
  ColumnDef,
  useSimpleMaterialTable,
  ColumnType,
  TextWithTooltipCell,
} from '@openmsupply-client/common';
import { ImportRow } from './EquipmentImportModal';
import { Status } from '../Components';

interface ImportReviewDataTableProps {
  importRows: ImportRow[];
  showWarnings: boolean;
  showErrors: boolean;
}
export const ImportReviewDataTable: FC<ImportReviewDataTableProps> = ({
  importRows,
  showWarnings,
  showErrors,
}) => {
  const t = useTranslation();
  const isCentralServer = useIsCentralServerApi();
  const { height } = useWindowDimensions();

  const [searchString, setSearchString] = useState<string>(() => '');

  const columns = useMemo(
    (): ColumnDef<ImportRow>[] => [
      {
        id: 'storeCode',
        accessorFn: row => row.store?.code,
        size: 90,
        header: t('label.store'),
        includeColumn: isCentralServer,
      },
      {
        accessorKey: 'assetNumber',
        size: 90,
        header: t('label.asset-number'),
      },
      {
        accessorKey: 'catalogueItemCode',
        size: 150,
        header: t('label.catalogue-item-code'),
      },
      {
        accessorKey: 'installationDate',
        header: t('label.installation-date'),
        size: 120,
        columnType: ColumnType.Date,
      },
      {
        accessorKey: 'replacementDate',
        header: t('label.replacement-date'),
        size: 120,
        columnType: ColumnType.Date,
      },
      {
        accessorKey: 'warrantyStart',
        header: t('label.warranty-start-date'),
        size: 120,
        columnType: ColumnType.Date,
      },
      {
        accessorKey: 'warrantyEnd',
        header: t('label.warranty-end-date'),
        size: 120,
        columnType: ColumnType.Date,
      },

      {
        accessorKey: 'serialNumber',
        header: t('label.serial'),
        size: 100,
        Cell: TextWithTooltipCell,
      },
      {
        id: 'status',
        accessorFn: row => row.status,
        header: t('label.status'),
        size: 100,
        Cell: ({ row }) => <Status status={row.original.status} />,
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
      },
      {
        accessorKey: 'warningMessage',
        header: t('label.warning-message'),
        size: 150,
        Cell: TextWithTooltipCell,
        includeColumn: showWarnings,
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

  const filteredEquipment = importRows.filter(row => {
    if (!searchString) {
      return true;
    }
    return (
      row.assetNumber.includes(searchString) ||
      (row.catalogueItemCode && row.catalogueItemCode.includes(searchString)) ||
      row.errorMessage?.includes(searchString) ||
      row.id === searchString
    );
  });

  const table = useSimpleMaterialTable<ImportRow>({
    tableId: 'import-equipment-review-table',
    data: filteredEquipment,
    columns,
    enableRowSelection: false,
    enableRowVirtualization: true,
  });

  return (
    <Grid
      flexDirection="column"
      display="flex"
      gap={2}
      maxHeight={height * 0.6}
    >
      <SearchBar
        placeholder={t('messages.search')}
        value={searchString}
        debounceTime={300}
        onChange={newValue => {
          setSearchString(newValue);
        }}
      />
      <MaterialTable table={table} />
    </Grid>
  );
};
