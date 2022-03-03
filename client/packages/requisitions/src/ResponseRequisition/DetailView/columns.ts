import {
  useColumns,
  GenericColumnKey,
  SortBy,
  Column,
} from '@openmsupply-client/common';
import { ResponseLineFragment } from './../api';

interface UseResponseColumnOptions {
  sortBy: SortBy<ResponseLineFragment>;
  onChangeSortBy: (
    column: Column<ResponseLineFragment>
  ) => SortBy<ResponseLineFragment>;
}

export const useResponseColumns = ({
  onChangeSortBy,
  sortBy,
}: UseResponseColumnOptions): Column<ResponseLineFragment>[] =>
  useColumns<ResponseLineFragment>(
    [
      ['itemCode', { accessor: ({ rowData }) => rowData.item.code }],
      ['itemName', { accessor: ({ rowData }) => rowData.item.name }],
      'comment',
      GenericColumnKey.Selection,
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );
