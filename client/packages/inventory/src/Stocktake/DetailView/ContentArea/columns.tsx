import React from 'react';
import {
  getRowExpandColumn,
  GenericColumnKey,
  useColumns,
  ColumnAlign,
  ArrayUtils,
  Column,
  SortBy,
  getLinesFromRow,
  TooltipTextCell,
  useTranslation,
  TypedTFunction,
  LocaleKey,
  useColumnUtils,
  NumberCell,
  ColumnDescription,
  UNDEFINED_STRING_VALUE,
  getCommentPopoverColumn,
  getDosesPerUnitColumn,
  getDifferenceColumn,
  usePreferences,
} from '@openmsupply-client/common';
import { ReasonOptionRowFragment } from '@openmsupply-client/system';
import { StocktakeSummaryItem } from '../../../types';
import { StocktakeLineFragment } from '../../api';
import { useStocktakeLineErrorContext } from '../../context';

interface UseStocktakeColumnOptions {
  sortBy: SortBy<StocktakeLineFragment | StocktakeSummaryItem>;
  onChangeSortBy: (sort: string, dir: 'desc' | 'asc') => void;
}

const expandColumn = getRowExpandColumn<
  StocktakeLineFragment | StocktakeSummaryItem
>();

const getStocktakeReasons = (
  rowData: StocktakeLineFragment | StocktakeSummaryItem,
  t: TypedTFunction<LocaleKey>
) => {
  if ('lines' in rowData) {
    const { lines } = rowData;
    const reasonOptions = lines
      .map(({ reasonOption }) => reasonOption)
      .filter(Boolean) as ReasonOptionRowFragment[];
    if (reasonOptions.length !== 0) {
      return (
        ArrayUtils.ifTheSameElseDefault(
          reasonOptions,
          'reason',
          t('multiple')
        ) ?? ''
      );
    } else {
      return '';
    }
  } else {
    return rowData.reasonOption?.reason ?? '';
  }
};

const getStocktakeDonor = (
  rowData: StocktakeLineFragment | StocktakeSummaryItem,
  t: TypedTFunction<LocaleKey>
) => {
  if ('lines' in rowData) {
    const { lines } = rowData;

    return (
      ArrayUtils.ifTheSameElseDefault(lines, 'donorName', t('multiple')) ??
      UNDEFINED_STRING_VALUE
    );
  } else {
    return rowData.donorName ?? UNDEFINED_STRING_VALUE;
  }
};

export const useStocktakeColumns = ({
  sortBy,
  onChangeSortBy,
}: UseStocktakeColumnOptions): Column<
  StocktakeLineFragment | StocktakeSummaryItem
>[] => {
  const t = useTranslation();
  const { getError } = useStocktakeLineErrorContext();
  const preferences = usePreferences();
  const { getColumnPropertyAsString, getColumnProperty } = useColumnUtils();

  const columns: ColumnDescription<
    StocktakeLineFragment | StocktakeSummaryItem
  >[] = [
    GenericColumnKey.Selection,
    [
      'itemCode',
      {
        getSortValue: row => {
          return row.item?.code ?? '';
        },
        accessor: ({ rowData }) => rowData.item?.code ?? '',
      },
    ],
    [
      'itemName',
      {
        Cell: TooltipTextCell,
        getSortValue: row =>
          getColumnPropertyAsString(row, [
            { path: ['lines', 'itemName'] },
            { path: ['itemName'], default: '' },
          ]),
        accessor: ({ rowData }) =>
          getColumnProperty(rowData, [
            { path: ['lines', 'itemName'] },
            { path: ['itemName'], default: '' },
          ]),
      },
    ],
    [
      'batch',
      {
        getSortValue: row =>
          getColumnPropertyAsString(row, [
            { path: ['lines', 'batch'] },
            { path: ['batch'], default: '' },
          ]),
        accessor: ({ rowData }) =>
          getColumnProperty(rowData, [
            { path: ['lines', 'batch'] },
            { path: ['batch'] },
          ]),
        defaultHideOnMobile: true,
      },
    ],
    [
      'expiryDate',
      {
        accessor: ({ rowData }) =>
          getColumnProperty(rowData, [
            { path: ['lines', 'expiryDate'] },
            { path: ['expiryDate'] },
          ]),
        defaultHideOnMobile: true,
      },
    ],
    {
      key: 'locationCode',
      label: 'label.location',
      width: 100,
      accessor: ({ rowData }) =>
        getColumnProperty(rowData, [
          { path: ['lines', 'location', 'code'] },
          { path: ['location', 'code'] },
        ]),
      defaultHideOnMobile: true,
    },
    [
      'itemUnit',
      {
        getSortValue: row => {
          return row.item?.unitName ?? '';
        },
        accessor: ({ rowData }) => rowData.item?.unitName ?? '',
        sortable: false,
        defaultHideOnMobile: true,
      },
    ],
    [
      'packSize',
      {
        Cell: NumberCell,
        accessor: ({ rowData }) =>
          getColumnProperty(rowData, [
            { path: ['lines', 'packSize'] },
            { path: ['packSize'] },
          ]),
        cellProps: {
          defaultValue: UNDEFINED_STRING_VALUE,
        },
        defaultHideOnMobile: true,
      },
    ],
  ];

  if (preferences.manageVaccinesInDoses) {
    columns.push(getDosesPerUnitColumn(t));
  }

  columns.push(
    {
      key: 'snapshotNumberOfPacks',
      label: 'label.snapshot-num-of-packs',
      description: 'description.snapshot-num-of-packs',
      align: ColumnAlign.Right,
      Cell: NumberCell,
      getIsError: row =>
        getLinesFromRow(row).some(
          r =>
            getError(r)?.__typename === 'SnapshotCountCurrentCountMismatchLine'
        ),
      sortable: true,
      accessor: ({ rowData }) => {
        if ('lines' in rowData) {
          const { lines } = rowData;
          return (
            lines.reduce(
              (total, line) => total + line.snapshotNumberOfPacks,
              0
            ) ?? 0
          ).toString();
        } else {
          return rowData.snapshotNumberOfPacks;
        }
      },
    },
    {
      key: 'countedNumberOfPacks',
      label: 'label.counted-num-of-packs',
      description: 'description.counted-num-of-packs',
      align: ColumnAlign.Right,
      Cell: props => (
        <NumberCell {...props} defaultValue={UNDEFINED_STRING_VALUE} />
      ),
      getIsError: row =>
        getLinesFromRow(row).some(
          r => getError(r)?.__typename === 'StockLineReducedBelowZero'
        ),
      sortable: true,
      accessor: ({ rowData }) => {
        if ('lines' in rowData) {
          const { lines } = rowData;
          const countedLines = lines.flatMap(
            ({ countedNumberOfPacks: counted }) =>
              typeof counted === 'number' ? [counted] : []
          );
          // No counted lines
          if (countedLines.length === 0) return null;
          return countedLines.reduce((total, counted) => total + counted, 0);
        } else {
          return rowData.countedNumberOfPacks;
        }
      },
    },
    getDifferenceColumn(t, preferences.manageVaccinesInDoses ?? false),
    {
      key: 'reasonOption',
      label: 'label.reason',
      accessor: ({ rowData }) => getStocktakeReasons(rowData, t),
      sortable: true,
    }
  );
  if (preferences.allowTrackingOfStockByDonor) {
    columns.push({
      key: 'donorId',
      label: 'label.donor',
      accessor: ({ rowData }) => getStocktakeDonor(rowData, t),
      sortable: false,
      defaultHideOnMobile: true,
    });
  }

  columns.push(getCommentPopoverColumn(), expandColumn);

  return useColumns(columns, { sortBy, onChangeSortBy }, [
    sortBy,
    onChangeSortBy,
  ]);
};

export const useExpansionColumns = (): Column<StocktakeLineFragment>[] => {
  const { getError } = useStocktakeLineErrorContext();

  return useColumns([
    'batch',
    'expiryDate',
    [
      'location',
      {
        accessor: ({ rowData }) => rowData.location?.code,
      },
    ],
    'packSize',
    {
      key: 'snapshotNumberOfPacks',
      width: 150,
      label: 'label.snapshot-num-of-packs',
      align: ColumnAlign.Right,
      getIsError: rowData =>
        getError(rowData)?.__typename ===
        'SnapshotCountCurrentCountMismatchLine',
      accessor: ({ rowData }) => rowData.snapshotNumberOfPacks,
    },
    {
      key: 'countedNumberOfPacks',
      label: 'label.counted-num-of-packs',
      width: 150,
      align: ColumnAlign.Right,
      getIsError: rowData =>
        getError(rowData)?.__typename === 'StockLineReducedBelowZero',
      accessor: ({ rowData }) => rowData.countedNumberOfPacks,
    },
    'comment',
    {
      key: 'reasonOption',
      label: 'label.reason',
      accessor: ({ rowData }) => rowData.reasonOption?.reason || '',
    },
  ]);
};
