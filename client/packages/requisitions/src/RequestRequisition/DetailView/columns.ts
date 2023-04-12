import { RequestLineFragment } from '../api/operations.generated';
import {
  useTranslation,
  ColumnAlign,
  useColumns,
  GenericColumnKey,
  getCommentPopoverColumn,
  useFormatNumber,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useRequest } from '../api';

export const useRequestColumns = () => {
  const t = useTranslation('common');
  const { maxMonthsOfStock } = useRequest.document.fields('maxMonthsOfStock');
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams();
  const formatNumber = useFormatNumber();
  const columns = useColumns<RequestLineFragment>(
    [
      getCommentPopoverColumn(),
      [
        'itemCode',
        {
          width: 100,
          accessor: ({ rowData }) => rowData.item.code,
          getSortValue: rowData => rowData.item.code,
        },
      ],
      [
        'itemName',
        {
          width: 350,
          accessor: ({ rowData }) => rowData.item.name,
          getSortValue: rowData => rowData.item.name,
        },
      ],
      {
        key: 'availableStockOnHand',
        label: 'label.stock-on-hand',
        description: 'description.stock-on-hand',
        align: ColumnAlign.Left,

        width: 200,
        accessor: ({ rowData }) => {
          const { itemStats } = rowData;
          const { availableStockOnHand, availableMonthsOfStockOnHand } =
            itemStats;

          const monthsString = availableMonthsOfStockOnHand
            ? `(${formatNumber.round(availableMonthsOfStockOnHand, 1)} ${t(
                'label.months',
                {
                  count: availableMonthsOfStockOnHand,
                }
              )})`
            : '';
          return `${availableStockOnHand} ${monthsString}`;
        },
        getSortValue: rowData => rowData.itemStats.availableStockOnHand,
      },
      [
        'monthlyConsumption',
        {
          width: 150,
          accessor: ({ rowData }) =>
            rowData.itemStats.averageMonthlyConsumption,
          getSortValue: rowData => rowData.itemStats.averageMonthlyConsumption,
        },
      ],
      {
        key: 'targetStock',
        label: 'label.target-stock',
        align: ColumnAlign.Right,
        width: 150,
        accessor: ({ rowData }) =>
          rowData.itemStats.averageMonthlyConsumption * maxMonthsOfStock,
        getSortValue: rowData =>
          rowData.itemStats.averageMonthlyConsumption * maxMonthsOfStock,
      },
      {
        key: 'suggestedQuantity',
        label: 'label.forecast-quantity',
        description: 'description.forecast-quantity',
        align: ColumnAlign.Right,
        width: 200,
        getSortValue: rowData => rowData.suggestedQuantity,
      },
      {
        key: 'requestedQuantity',
        label: 'label.requested-quantity',
        align: ColumnAlign.Right,
        width: 150,
        getSortValue: rowData => rowData.requestedQuantity,
      },
      // TODO: Should only be visible if linked requisition has approvalStatus != None)
      {
        key: 'approvedQuantity',
        label: 'label.approved-quantity',
        accessor: ({ rowData }) =>
          rowData.linkedRequisitionLine?.approvedQuantity,
      },
      {
        key: 'approvalComment',
        label: 'label.approval-comment',
        accessor: ({ rowData }) =>
          rowData.linkedRequisitionLine?.approvalComment,
      },
      GenericColumnKey.Selection,
    ],
    {
      onChangeSortBy: updateSortQuery,
      sortBy,
    },
    [updateSortQuery, sortBy]
  );

  return { columns, sortBy, onChangeSortBy: updateSortQuery };
};
