import {
  GenericColumnKey,
  useColumns,
  ColumnAlign,
  ifTheSameElseDefault,
  formatExpiryDate,
  Column,
  SortBy,
  SortRule,
} from '@openmsupply-client/common';
import { StocktakeLine, StocktakeSummaryItem } from './../../types';

interface UseStocktakeColumnOptions {
  sortBy: SortBy<StocktakeLine | StocktakeSummaryItem>;
  onChangeSortBy: (
    newSortRule: SortRule<StocktakeLine | StocktakeSummaryItem>
  ) => SortBy<StocktakeLine | StocktakeSummaryItem>;
}

export const useStocktakeColumns = ({
  sortBy,
  onChangeSortBy,
}: UseStocktakeColumnOptions): Column<StocktakeLine | StocktakeSummaryItem>[] =>
  useColumns<StocktakeLine | StocktakeSummaryItem>(
    [
      [
        'itemCode',
        {
          getSortValue: row => {
            if ('lines' in row) {
              const { lines } = row;
              return ifTheSameElseDefault(lines, 'itemCode', '');
            } else {
              return row.itemCode;
            }
          },
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return ifTheSameElseDefault(lines, 'itemCode', '');
            } else {
              return rowData.itemCode;
            }
          },
        },
      ],
      [
        'itemName',
        {
          getSortValue: row => {
            if ('lines' in row) {
              const { lines } = row;
              return ifTheSameElseDefault(lines, 'itemName', '');
            } else {
              return row.itemName;
            }
          },
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return ifTheSameElseDefault(lines, 'itemName', '');
            } else {
              return rowData.itemName;
            }
          },
        },
      ],
      [
        'batch',
        {
          getSortValue: row => {
            if ('lines' in row) {
              const { lines } = row;
              return ifTheSameElseDefault(lines, 'batch', '[multiple]') ?? '';
            } else {
              return row.batch ?? '';
            }
          },
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return ifTheSameElseDefault(lines, 'batch', '[multiple]');
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
                ifTheSameElseDefault(lines, 'expiryDate', null) ?? '';
              return (expiryDate && formatExpiryDate(expiryDate)) || '';
            } else {
              return formatExpiryDate(row.expiryDate) ?? '';
            }
          },
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              const expiryDate = ifTheSameElseDefault(
                lines,
                'expiryDate',
                null
              );
              return formatExpiryDate(expiryDate);
            } else {
              return formatExpiryDate(rowData.expiryDate);
            }
          },
        },
      ],

      {
        key: 'countedNumPacks',
        label: 'label.counted-num-of-packs',
        width: 150,
        align: ColumnAlign.Right,
        getSortValue: row => {
          if ('lines' in row) {
            const { lines } = row;
            return ifTheSameElseDefault(lines, 'countedNumPacks', '') ?? '';
          } else {
            return row.countedNumPacks ?? '';
          }
        },
        accessor: ({ rowData }) => {
          if ('lines' in rowData) {
            const { lines } = rowData;
            return ifTheSameElseDefault(lines, 'countedNumPacks', '');
          } else {
            return rowData.countedNumPacks;
          }
        },
      },

      {
        key: 'snapshotNumPacks',
        label: 'label.snapshot-num-of-packs',
        align: ColumnAlign.Right,
        getSortValue: row => {
          if ('lines' in row) {
            const { lines } = row;
            return ifTheSameElseDefault(lines, 'snapshotNumPacks', '') ?? '';
          } else {
            return row.snapshotNumPacks ?? '';
          }
        },
        accessor: ({ rowData }) => {
          if ('lines' in rowData) {
            const { lines } = rowData;
            return ifTheSameElseDefault(lines, 'snapshotNumPacks', '');
          } else {
            return rowData.snapshotNumPacks;
          }
        },
      },

      GenericColumnKey.Selection,
    ],
    { sortBy, onChangeSortBy },
    [sortBy, onChangeSortBy]
  );
