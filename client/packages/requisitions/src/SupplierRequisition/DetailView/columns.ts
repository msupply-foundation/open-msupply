import {
  useColumns,
  Column,
  SortBy,
  SortRule,
  GenericColumnKey,
} from '@openmsupply-client/common';
import { RequisitionLine } from '../../types';

interface UseSupplierRequisitionColumnOptions {
  sortBy: SortBy<RequisitionLine>;
  onChangeSortBy: (
    newSortRule: SortRule<RequisitionLine>
  ) => SortBy<RequisitionLine>;
}

export const useSupplierRequisitionColumns = ({
  sortBy,
  onChangeSortBy,
}: UseSupplierRequisitionColumnOptions): Column<RequisitionLine>[] => {
  return useColumns<RequisitionLine>(
    [
      ['itemCode', { width: 50 }],
      ['itemName', { width: 150 }],

      'monthlyConsumption',

      [
        'previousStockOnHand',
        {
          accessor: ({ rowData }) =>
            `${rowData.previousStockOnHand} (${Math.floor(
              (rowData?.previousStockOnHand ?? 0) /
                (rowData?.monthlyConsumption ?? 0)
            )} months)`,
        },
      ],
      [
        'calculatedQuantity',
        {
          accessor: ({ rowData }) => {
            const threeMonthsStock = rowData?.monthlyConsumption ?? 1 * 3;
            const diff = threeMonthsStock - (rowData?.previousStockOnHand ?? 0);
            if (diff > 0) {
              return `${diff.toFixed(2)} (${Math.floor(
                diff / (rowData?.monthlyConsumption ?? 1)
              )} months)`;
            } else {
              return 0;
            }
          },
        },
      ],
      ['forecastMethod', { accessor: () => 'AMC' }],
      'requestedQuantity',
      ['comment', { width: 150 }],
      GenericColumnKey.Selection,
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );
};
