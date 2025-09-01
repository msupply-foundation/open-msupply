import React from 'react';
import {
  MiniTable,
  Column,
  ColumnDescription,
  NumberCell,
  useColumns,
  getDosesPerUnitColumn,
  TypedTFunction,
  LocaleKey,
  useTranslation,
  usePreferences,
} from '@openmsupply-client/common';
import { StockOutLineFragment } from '../../StockOut';
import { StockOutItem } from '../../types';
import { getDosesQuantityColumn } from '../../DoseQtyColumn';

export const Expand = ({
  rowData,
}: {
  rowData: StockOutLineFragment | StockOutItem;
}) => {
  const { manageVaccinesInDoses } = usePreferences();
  if ('lines' in rowData && rowData.lines.length > 1) {
    // Display in doses pref on, but only show dose columns if we've expanded a vaccine item
    const withDoseColumns =
      (manageVaccinesInDoses && rowData.lines[0]?.item.isVaccine) ?? false;

    return (
      <ExpandInner rows={rowData.lines} withDoseColumns={withDoseColumns} />
    );
  } else {
    return null;
  }
};

const ExpandInner = ({
  rows,
  withDoseColumns,
}: {
  rows: StockOutLineFragment[];
  withDoseColumns: boolean;
}) => {
  const t = useTranslation();
  const expandoColumns = useExpansionColumns(withDoseColumns, t);

  return <MiniTable rows={rows} columns={expandoColumns} />;
};

const useExpansionColumns = (
  withDoseColumns: boolean,
  t: TypedTFunction<LocaleKey>
): Column<StockOutLineFragment>[] => {
  const columns: ColumnDescription<StockOutLineFragment>[] = [
    'batch',
    'expiryDate',
    [
      'location',
      {
        accessor: ({ rowData }) => rowData.location?.code,
      },
    ],
    [
      'itemUnit',
      {
        accessor: ({ rowData }) => rowData.item.unitName,
      },
    ],
    ['packSize', { Cell: NumberCell }],
  ];

  if (withDoseColumns) {
    columns.push(getDosesPerUnitColumn(t));
  }
  columns.push('numberOfPacks', [
    'unitQuantity',
    {
      accessor: ({ rowData }) => rowData.packSize * rowData.numberOfPacks,
    },
  ]);

  if (withDoseColumns) {
    columns.push(getDosesQuantityColumn());
  }

  columns.push([
    'sellPricePerUnit',
    {
      accessor: ({ rowData }) => rowData.sellPricePerPack / rowData.packSize,
    },
  ]);

  return useColumns(columns);
};
