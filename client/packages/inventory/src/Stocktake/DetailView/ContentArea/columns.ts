import {
  getRowExpandColumn,
  GenericColumnKey,
  useColumns,
  ColumnAlign,
  ifTheSameElseDefault,
  formatExpiryDate,
  Column,
  SortBy,
} from '@openmsupply-client/common';
import { StocktakeSummaryItem } from '../../../types';
import { StocktakeLineFragment } from '../../api';

interface UseStocktakeColumnOptions {
  sortBy: SortBy<StocktakeLineFragment | StocktakeSummaryItem>;
  onChangeSortBy: (
    column: Column<StocktakeLineFragment | StocktakeSummaryItem>
  ) => SortBy<StocktakeLineFragment | StocktakeSummaryItem>;
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
              return (
                (expiryDate && formatExpiryDate(new Date(expiryDate))) || ''
              );
            } else {
              return row.expiryDate
                ? formatExpiryDate(new Date(row.expiryDate)) ?? ''
                : '';
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
          width: 50,
          getSortValue: row => {
            if ('lines' in row) {
              const { lines } = row;
              return ifTheSameElseDefault(lines, 'packSize', '') ?? '';
            } else {
              return row.packSize ?? '';
            }
          },
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return ifTheSameElseDefault(lines, 'packSize', '');
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
        width: 180,
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
