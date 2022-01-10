import {
  GenericColumnKey,
  useColumns,
  ColumnAlign,
  SortBy,
  SortRule,
} from '@openmsupply-client/common';
import { StocktakeItem } from './../../types';

interface UseStocktakeColumnOptions {
  sortBy: SortBy<StocktakeItem>;
  onChangeSortBy: (
    newSortRule: SortRule<StocktakeItem>
  ) => SortBy<StocktakeItem>;
}

export const useStocktakeColumns = ({
  sortBy,
  onChangeSortBy,
}: UseStocktakeColumnOptions) =>
  useColumns<StocktakeItem>(
    [
      'itemCode',
      'itemName',
      'batch',
      'expiryDate',
      {
        key: 'countedNumPacks',
        label: 'label.counted-num-of-packs',
        width: 150,
        align: ColumnAlign.Right,
      },
      {
        key: 'snapshotNumPacks',
        label: 'label.snapshot-num-of-packs',
        align: ColumnAlign.Right,
      },

      GenericColumnKey.Selection,
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );
