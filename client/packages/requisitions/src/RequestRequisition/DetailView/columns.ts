import { RequestRequisitionLineFragment } from '../api/operations.generated';
import {
  useColumns,
  Column,
  SortBy,
  GenericColumnKey,
} from '@openmsupply-client/common';

interface UseRequestRequisitionColumnOptions {
  sortBy: SortBy<RequestRequisitionLineFragment>;
  onChangeSortBy: (
    column: Column<RequestRequisitionLineFragment>
  ) => SortBy<RequestRequisitionLineFragment>;
}

export const useRequestRequisitionColumns = ({
  sortBy,
  onChangeSortBy,
}: UseRequestRequisitionColumnOptions): Column<RequestRequisitionLineFragment>[] => {
  return useColumns<RequestRequisitionLineFragment>(
    [
      ['itemCode', { width: 50 }],
      ['itemName', { width: 150 }],

      'monthlyConsumption',

      [
        'previousStockOnHand',
        {
          accessor: ({ rowData }) =>
            `${rowData.itemStats.stockOnHand} (${Math.floor(
              (rowData.itemStats.stockOnHand ?? 0) /
                (rowData?.itemStats.averageMonthlyConsumption ?? 0)
            )} months)`,
        },
      ],
      [
        'calculatedQuantity',
        {
          accessor: ({ rowData }) => {
            const threeMonthsStock =
              rowData?.itemStats.averageMonthlyConsumption ?? 1 * 3;
            const diff =
              threeMonthsStock - (rowData?.itemStats.stockOnHand ?? 0);
            if (diff > 0) {
              return `${diff.toFixed(2)} (${Math.floor(
                diff / (rowData?.itemStats.averageMonthlyConsumption ?? 1)
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
