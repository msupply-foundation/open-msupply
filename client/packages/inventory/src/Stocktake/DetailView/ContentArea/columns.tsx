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
} from '@openmsupply-client/common';
import {
  InventoryAdjustmentReasonRowFragment,
  getPackVariantCell,
  useIsPackVariantsEnabled,
} from '@openmsupply-client/system';
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

  const isPackVariantsEnabled = useIsPackVariantsEnabled();

  const columns: ColumnDescription<
    StocktakeLineFragment | StocktakeSummaryItem
  >[] = [
    [
      'itemCode',
      {
        getSortValue: row => {
          return row.item?.code ?? '';
        },
        accessor: ({ rowData }) => {
          return rowData.item?.code ?? '';
        },
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
  ];

  if (isPackVariantsEnabled) {
    columns.push({
      key: 'packUnit',
      label: 'label.pack',
      sortable: false,
      Cell: getPackVariantCell({
        getItemId: row => row?.item?.id ?? '',
        getPackSizes: row => {
          if ('lines' in row) return row.lines.map(l => l.packSize ?? 1);
          else return [row.packSize ?? 1];
        },
        getUnitName: row => row?.item?.unitName ?? null,
      }),
      width: 130,
    });
  } else {
    columns.push(
      [
        'itemUnit',
        {
          getSortValue: row => {
            return row.item?.unitName ?? '';
          },
          accessor: ({ rowData }) => {
            return rowData.item?.unitName ?? '';
          },
          sortable: false,
        },
      ],
      [
        'packSize',
        {
          accessor: ({ rowData }) =>
            getColumnProperty(rowData, [
              { path: ['lines', 'packSize'] },
              { path: ['packSize'] },
            ]),
        },
      ]
    );
  }

  columns.push(
    {
      key: 'snapshotNumPacks',
      label: 'label.snapshot-num-of-packs',
      description: 'description.snapshot-num-of-packs',
      align: ColumnAlign.Right,
      Cell: NumberCell,
      getIsError: row =>
        getLinesFromRow(row).some(
          r => getError(r)?.__typename === 'SnapshotCountCurrentCountMismatch'
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
      Cell: props => <NumberCell {...props} defaultValue={'-'} />,
      getIsError: row =>
        getLinesFromRow(row).some(
          r => getError(r)?.__typename === 'StockLineReducedBelowZero'
        ),
      sortable: false,
      accessor: ({ rowData }) => {
        if ('lines' in rowData) {
          const { lines } = rowData;
          return (
            lines.reduce(
              (total, line) => total + (line.countedNumberOfPacks ?? 0),
              0
            ) ?? 0
          ).toString();
        } else {
          return rowData.countedNumberOfPacks;
        }
      },
    },
    {
      key: 'difference',
      label: 'label.difference',
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
    {
      key: 'comment',
      label: 'label.stocktake-comment',
      sortable: false,
      accessor: ({ rowData }) =>
        getColumnProperty(rowData, [
          { path: ['lines', 'comment'] },
          { path: ['comment'] },
        ]),
    },
    expandColumn,
    GenericColumnKey.Selection
  );

  return useColumns(columns, { sortBy, onChangeSortBy }, [
    sortBy,
    onChangeSortBy,
  ]);
};

export const useExpansionColumns = (): Column<StocktakeLineFragment>[] => {
  const { getError } = useStocktakeLineErrorContext();
  const isPackVariantsEnabled = useIsPackVariantsEnabled();

  return useColumns([
    'batch',
    'expiryDate',
    [
      'location',
      {
        accessor: ({ rowData }) => rowData.location?.code,
      },
    ],
    ...(isPackVariantsEnabled
      ? [
          {
            key: 'packUnit',
            label: 'label.pack',
            sortable: false,
            Cell: getPackVariantCell({
              getItemId: row => row?.itemId,
              getPackSizes: row => {
                return [row?.packSize ?? 1];
              },
              getUnitName: row => row?.item.unitName ?? null,
            }),
            width: 130,
          } as ColumnDescription<StocktakeLineFragment>,
        ]
      : ['packSize' as ColumnDescription<StocktakeLineFragment>]),
    {
      key: 'snapshotNumPacks',
      width: 150,
      label: 'label.snapshot-num-of-packs',
      align: ColumnAlign.Right,
      getIsError: rowData =>
        getError(rowData)?.__typename === 'SnapshotCountCurrentCountMismatch',
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
