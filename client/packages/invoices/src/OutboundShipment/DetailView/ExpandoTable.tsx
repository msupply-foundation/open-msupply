import React from 'react';
import {
  MiniTable,
  Column,
  ColumnDescription,
  NumberCell,
  useColumns,
  UNDEFINED_STRING_VALUE,
} from '@openmsupply-client/common';
import { StockOutLineFragment } from '../../StockOut';
import { StockOutItem } from '../../types';

export const Expand = ({
  rowData,
  displayDoseColumns,
}: {
  rowData: StockOutLineFragment | StockOutItem;
  displayDoseColumns?: boolean;
}) => {
  if ('lines' in rowData && rowData.lines.length > 1) {
    // Display in doses pref on, but only show dose columns if we've expanded a vaccine item
    const withDoseColumns =
      (displayDoseColumns && rowData.lines[0]?.item.isVaccine) ?? false;

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
  const expandoColumns = useExpansionColumns(withDoseColumns);

  return <MiniTable rows={rows} columns={expandoColumns} />;
};

const useExpansionColumns = (
  withDoseColumns: boolean
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
    ...(withDoseColumns ? [getDosesPerUnitColumn()] : []),
    'numberOfPacks',
    [
      'unitQuantity',
      {
        accessor: ({ rowData }) => rowData.packSize * rowData.numberOfPacks,
      },
    ],
    ...(withDoseColumns ? [getDoseQuantityColumn()] : []),
    [
      'sellPricePerUnit',
      {
        accessor: ({ rowData }) => rowData.sellPricePerPack / rowData.packSize,
      },
    ],
  ];

  return useColumns(columns);
};

// TODO dupes again!!
const getDosesPerUnitColumn = (): ColumnDescription<StockOutLineFragment> => ({
  key: 'dosesPerUnit', // todo?
  label: 'label.doses-per-unit',
  accessor: ({ rowData }) => {
    // This will get more complex once doses per unit is configured by item variant!
    // return rowData?.doses,
    return rowData?.item?.doses ?? UNDEFINED_STRING_VALUE;
  },
});

// TODO: share with common when exists
const getDoseQuantityColumn = (): ColumnDescription<StockOutLineFragment> => ({
  key: 'doseQuantity',
  label: 'label.doses',
  width: 100,
  accessor: ({ rowData }) => {
    // This will get more complex once doses per unit is configured by item variant!
    return rowData.packSize * rowData.numberOfPacks * rowData.item.doses;
  },
});
