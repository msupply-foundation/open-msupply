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
} from '@openmsupply-client/common';
import { InventoryAdjustmentReasonRowFragment } from '@openmsupply-client/system';
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
    const inventoryAdjustmentReasons = lines
      .map(({ inventoryAdjustmentReason }) => inventoryAdjustmentReason)
      .filter(Boolean) as InventoryAdjustmentReasonRowFragment[];
    if (inventoryAdjustmentReasons.length !== 0) {
      return (
        ArrayUtils.ifTheSameElseDefault(
          inventoryAdjustmentReasons,
          'reason',
          t('multiple')
        ) ?? ''
      );
    } else {
      return '';
    }
  } else {
    return rowData.inventoryAdjustmentReason?.reason ?? '';
  }
};

export const useStocktakeColumns = ({
  sortBy,
  onChangeSortBy,
}: UseStocktakeColumnOptions): Column<
  StocktakeLineFragment | StocktakeSummaryItem
>[] => {
  const { getError } = useStocktakeLineErrorContext();
  const t = useTranslation();
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
    },
    [
      'itemUnit',
      {
        getSortValue: row => {
          return row.item?.unitName ?? '';
        },
        accessor: ({ rowData }) => rowData.item?.unitName ?? '',
        sortable: false,
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
      },
    ],
    {
      key: 'snapshotNumPacks',
      label: 'label.snapshot-num-of-packs',
      description: 'description.snapshot-num-of-packs',
      align: ColumnAlign.Right,
      Cell: NumberCell,
      getIsError: row =>
        getLinesFromRow(row).some(
          r =>
            getError(r)?.__typename === 'SnapshotCountCurrentCountMismatchLine'
        ),
      sortable: false,
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
      key: 'countedNumPacks',
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
      sortable: false,
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
    {
      key: 'difference',
      label: 'label.difference',
      Cell: props => (
        <NumberCell {...props} defaultValue={UNDEFINED_STRING_VALUE} />
      ),
      align: ColumnAlign.Right,
      sortable: false,
      accessor: ({ rowData }) => {
        if ('lines' in rowData) {
          const { lines } = rowData;
          const total =
            lines.reduce(
              (total, line) =>
                total +
                (line.snapshotNumberOfPacks -
                  (line.countedNumberOfPacks ?? line.snapshotNumberOfPacks)),
              0
            ) ?? 0;
          return (total < 0 ? Math.abs(total) : -total).toString();
        } else if (rowData.countedNumberOfPacks === null) {
          return null;
        } else {
          return (
            (rowData.countedNumberOfPacks ?? rowData.snapshotNumberOfPacks) -
            rowData.snapshotNumberOfPacks
          );
        }
      },
    },
    {
      key: 'inventoryAdjustmentReason',
      label: 'label.reason',
      accessor: ({ rowData }) => getStocktakeReasons(rowData, t),
      sortable: false,
    },

    getCommentPopoverColumn(),
    expandColumn,
  ];

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
      key: 'snapshotNumPacks',
      width: 150,
      label: 'label.snapshot-num-of-packs',
      align: ColumnAlign.Right,
      getIsError: rowData =>
        getError(rowData)?.__typename ===
        'SnapshotCountCurrentCountMismatchLine',
      accessor: ({ rowData }) => rowData.snapshotNumberOfPacks,
    },
    {
      key: 'countedNumPacks',
      label: 'label.counted-num-of-packs',
      width: 150,
      align: ColumnAlign.Right,
      getIsError: rowData =>
        getError(rowData)?.__typename === 'StockLineReducedBelowZero',
      accessor: ({ rowData }) => rowData.countedNumberOfPacks,
    },
    'comment',
    {
      key: 'inventoryAdjustmentReason',
      label: 'label.reason',
      accessor: ({ rowData }) =>
        rowData.inventoryAdjustmentReason?.reason || '',
    },
  ]);
};
