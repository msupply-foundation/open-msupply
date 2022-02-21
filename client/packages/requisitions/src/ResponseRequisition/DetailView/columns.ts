import {
  useColumns,
  GenericColumnKey,
  SortBy,
  Column,
} from '@openmsupply-client/common';
import { ResponseRequisitionLineFragment } from './../api';

interface UseResponseRequisitionColumnOptions {
  sortBy: SortBy<ResponseRequisitionLineFragment>;
  onChangeSortBy: (
    column: Column<ResponseRequisitionLineFragment>
  ) => SortBy<ResponseRequisitionLineFragment>;
}

export const useResponseRequisitionColumns = ({
  onChangeSortBy,
  sortBy,
}: UseResponseRequisitionColumnOptions): Column<ResponseRequisitionLineFragment>[] =>
  useColumns<ResponseRequisitionLineFragment>(
    ['itemCode', 'itemName', 'comment', GenericColumnKey.Selection],
    { onChangeSortBy, sortBy },
    [sortBy]
  );
