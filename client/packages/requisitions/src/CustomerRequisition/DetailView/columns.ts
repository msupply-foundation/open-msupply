import {
  useColumns,
  GenericColumnKey,
  SortBy,
  Column,
} from '@openmsupply-client/common';
import { RequisitionLine } from '../../types';

interface UseCustomerRequisitionColumnOptions {
  sortBy: SortBy<RequisitionLine>;
  onChangeSortBy: (column: Column<RequisitionLine>) => SortBy<RequisitionLine>;
}

export const useCustomerRequisitionColumns = ({
  onChangeSortBy,
  sortBy,
}: UseCustomerRequisitionColumnOptions): Column<RequisitionLine>[] =>
  useColumns<RequisitionLine>(
    ['itemCode', 'itemName', 'comment', GenericColumnKey.Selection],
    { onChangeSortBy, sortBy },
    [sortBy]
  );
