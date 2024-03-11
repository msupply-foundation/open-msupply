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

  return useColumns<StocktakeLineFragment | StocktakeSummaryItem>(
    [
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
          getSortValue: row => {
            return row.item?.name ?? '';
          },
          accessor: ({ rowData }) => {
            return rowData.item?.name ?? '';
          },
        },
      ],
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
        width: 90,
        accessor: ({ rowData }) =>
          getColumnProperty(rowData, [
            { path: ['lines', 'location', 'code'] },
            { path: ['location', 'code'] },
          ]),
      },
      [
        'packSize',
        {
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
      GenericColumnKey.Selection,
    ],
    { sortBy, onChangeSortBy },
    [sortBy, onChangeSortBy]
  );
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
