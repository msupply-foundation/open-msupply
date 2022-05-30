import {
  getRowExpandColumn,
  GenericColumnKey,
  useColumns,
  ColumnAlign,
  ArrayUtils,
  Formatter,
  Column,
  SortBy,
} from '@openmsupply-client/common';
import { StocktakeSummaryItem } from '../../../types';
import { StocktakeLineFragment } from '../../api';

interface UseStocktakeColumnOptions {
  sortBy: SortBy<StocktakeLineFragment | StocktakeSummaryItem>;
  onChangeSortBy: (
    column: Column<StocktakeLineFragment | StocktakeSummaryItem>
  ) => void;
}

const expandColumn = getRowExpandColumn<
  StocktakeLineFragment | StocktakeSummaryItem
>();

export const useStocktakeColumns = ({
  sortBy,
  onChangeSortBy,
}: UseStocktakeColumnOptions): Column<
  StocktakeLineFragment | StocktakeSummaryItem
>[] =>
  useColumns<StocktakeLineFragment | StocktakeSummaryItem>(
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
          getSortValue: row => {
            return row.item?.name ?? '';
          },
          accessor: ({ rowData }) => {
            return rowData.item?.name ?? '';
          },
        },
      ],
      [
        'batch',
        {
          getSortValue: row => {
            if ('lines' in row) {
              const { lines } = row;
              return (
                ArrayUtils.ifTheSameElseDefault(lines, 'batch', '[multiple]') ??
                ''
              );
            } else {
              return row.batch ?? '';
            }
          },
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return ArrayUtils.ifTheSameElseDefault(
                lines,
                'batch',
                '[multiple]'
              );
            } else {
              return rowData.batch;
            }
          },
        },
      ],
      [
        'expiryDate',
        {
          getSortValue: row => {
            if ('lines' in row) {
              const { lines } = row;
              const expiryDate =
                ArrayUtils.ifTheSameElseDefault(lines, 'expiryDate', null) ??
                '';
              return (
                (expiryDate && Formatter.expiryDate(new Date(expiryDate))) || ''
              );
            } else {
              return row.expiryDate
                ? Formatter.expiryDate(new Date(row.expiryDate)) ?? ''
                : '';
            }
          },
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              const expiryDate = ArrayUtils.ifTheSameElseDefault(
                lines,
                'expiryDate',
                null
              );
              return expiryDate;
            } else {
              return rowData.expiryDate;
            }
          },
        },
      ],
      [
        'packSize',
        {
          width: 125,
          getSortValue: row => {
            if ('lines' in row) {
              const { lines } = row;
              return (
                ArrayUtils.ifTheSameElseDefault(lines, 'packSize', '') ?? ''
              );
            } else {
              return row.packSize ?? '';
            }
          },
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return ArrayUtils.ifTheSameElseDefault(lines, 'packSize', '');
            } else {
              return rowData.packSize;
            }
          },
        },
      ],
      {
        key: 'snapshotNumPacks',
        width: 180,
        label: 'label.snapshot-num-of-packs',
        align: ColumnAlign.Right,
        getSortValue: row => {
          if ('lines' in row) {
            const { lines } = row;
            return (
              ArrayUtils.ifTheSameElseDefault(
                lines,
                'snapshotNumberOfPacks',
                ''
              ) ?? ''
            );
          } else {
            return row.snapshotNumberOfPacks ?? '';
          }
        },
        accessor: ({ rowData }) => {
          if ('lines' in rowData) {
            const { lines } = rowData;
            return ArrayUtils.ifTheSameElseDefault(
              lines,
              'snapshotNumberOfPacks',
              ''
            );
          } else {
            return rowData.snapshotNumberOfPacks;
          }
        },
      },
      {
        key: 'countedNumPacks',
        label: 'label.counted-num-of-packs',
        width: 180,
        align: ColumnAlign.Right,
        getSortValue: row => {
          if ('lines' in row) {
            const { lines } = row;
            return (
              ArrayUtils.ifTheSameElseDefault(
                lines,
                'countedNumberOfPacks',
                ''
              ) ?? ''
            );
          } else {
            return row.countedNumberOfPacks ?? '';
          }
        },
        accessor: ({ rowData }) => {
          if ('lines' in rowData) {
            const { lines } = rowData;
            return ArrayUtils.ifTheSameElseDefault(
              lines,
              'countedNumberOfPacks',
              ''
            );
          } else {
            return rowData.countedNumberOfPacks;
          }
        },
      },
      expandColumn,
      GenericColumnKey.Selection,
    ],
    { sortBy, onChangeSortBy },
    [sortBy, onChangeSortBy]
  );

export const useExpansionColumns = (): Column<StocktakeLineFragment>[] =>
  useColumns([
    'batch',
    'expiryDate',
    'packSize',
    {
      key: 'snapshotNumPacks',
      width: 200,
      label: 'label.snapshot-num-of-packs',
      align: ColumnAlign.Right,
      accessor: ({ rowData }) => rowData.snapshotNumberOfPacks,
    },
    {
      key: 'countedNumPacks',
      label: 'label.counted-num-of-packs',
      width: 200,
      align: ColumnAlign.Right,
      accessor: ({ rowData }) => rowData.countedNumberOfPacks,
    },
  ]);
