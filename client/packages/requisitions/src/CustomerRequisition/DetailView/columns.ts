import {
  useColumns,
  GenericColumnKey,
  SortBy,
  Column,
} from '@openmsupply-client/common';
import { ResponseRequisitionLineFragment } from './../api';

interface UseCustomerRequisitionColumnOptions {
  sortBy: SortBy<ResponseRequisitionLineFragment>;
  onChangeSortBy: (
    column: Column<ResponseRequisitionLineFragment>
  ) => SortBy<ResponseRequisitionLineFragment>;
}

export const useCustomerRequisitionColumns = ({
  onChangeSortBy,
  sortBy,
}: UseCustomerRequisitionColumnOptions): Column<ResponseRequisitionLineFragment>[] =>
  useColumns<ResponseRequisitionLineFragment>(
    ['itemCode', 'itemName', 'comment', GenericColumnKey.Selection],
    { onChangeSortBy, sortBy },
    [sortBy]
  );
