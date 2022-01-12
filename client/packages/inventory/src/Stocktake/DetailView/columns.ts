import {
  getRowExpandColumn,
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

const expandColumn = getRowExpandColumn<StocktakeLine | StocktakeSummaryItem>();

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
      ['packSize', { width: 125 }],
      {
        key: 'snapshotNumPacks',
        width: 200,
        label: 'label.snapshot-num-of-packs',
        align: ColumnAlign.Right,
        getSortValue: row => {
          if ('lines' in row) {
            const { lines } = row;
            return (
              ifTheSameElseDefault(lines, 'snapshotNumberOfPacks', '') ?? ''
            );
          } else {
            return row.snapshotNumberOfPacks ?? '';
          }
        },
        accessor: ({ rowData }) => {
          if ('lines' in rowData) {
            const { lines } = rowData;
            return ifTheSameElseDefault(lines, 'snapshotNumberOfPacks', '');
          } else {
            return rowData.snapshotNumberOfPacks;
          }
        },
      },
      {
        key: 'countedNumPacks',
        label: 'label.counted-num-of-packs',
        width: 200,
        align: ColumnAlign.Right,
        getSortValue: row => {
          if ('lines' in row) {
            const { lines } = row;
            return (
              ifTheSameElseDefault(lines, 'countedNumberOfPacks', '') ?? ''
            );
          } else {
            return row.countedNumberOfPacks ?? '';
          }
        },
        accessor: ({ rowData }) => {
          if ('lines' in rowData) {
            const { lines } = rowData;
            return ifTheSameElseDefault(lines, 'countedNumberOfPacks', '');
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
