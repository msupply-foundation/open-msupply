import { RequestLineFragment } from '../api';
import {
  useTranslation,
  ColumnAlign,
  useColumns,
  GenericColumnKey,
  getCommentPopoverColumn,
  useFormatNumber,
  useUrlQueryParams,
  ColumnDescription,
  TooltipTextCell,
} from '@openmsupply-client/common';
import { useRequest } from '../api';

export const useRequestColumns = () => {
  const t = useTranslation();
  const { maxMonthsOfStock } = useRequest.document.fields('maxMonthsOfStock');
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });
  const formatNumber = useFormatNumber();
  const { usesRemoteAuthorisation } = useRequest.utils.isRemoteAuthorisation();

  const columnDefinitions: ColumnDescription<RequestLineFragment>[] = [
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
        Cell: TooltipTextCell,
        width: 350,
        accessor: ({ rowData }) => rowData.item.name,
        getSortValue: rowData => rowData.item.name,
      },
    ],
    {
      key: 'unit',
      label: 'label.unit',
      align: ColumnAlign.Left,
      accessor: ({ rowData }) => rowData.item.unitName,
      getSortValue: rowData => rowData.item.unitName ?? '',
    },
    {
      key: 'defaultPackSize',
      label: 'label.dps',
      description: 'description.default-pack-size',
      align: ColumnAlign.Right,
      accessor: ({ rowData }) => rowData.item.defaultPackSize,
      getSortValue: rowData => rowData.item.defaultPackSize,
    },
    {
      key: 'availableStockOnHand',
      label: 'label.stock-on-hand',
      description: 'description.stock-on-hand',
      align: ColumnAlign.Right,
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
        align: ColumnAlign.Right,
        accessor: ({ rowData }) => rowData.itemStats.averageMonthlyConsumption,
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
    {
      key: 'requestedNumPacks',
      label: 'label.requested-packs',
      description: 'label.requested-number-packs',
      align: ColumnAlign.Right,
      accessor: ({ rowData }) =>
        formatNumber.round(
          rowData.requestedQuantity / rowData.item.defaultPackSize,
          2
        ),
      sortable: false,
    },
  ];

  if (usesRemoteAuthorisation) {
    columnDefinitions.push({
      key: 'approvedQuantity',
      label: 'label.approved-quantity',
      align: ColumnAlign.Right,
      sortable: false,
      accessor: ({ rowData }) =>
        rowData.linkedRequisitionLine?.approvedQuantity,
    });
    columnDefinitions.push({
      key: 'approvedNumPacks',
      label: 'label.approved-packs',
      align: ColumnAlign.Right,
      accessor: ({ rowData }) =>
        formatNumber.round(
          (rowData.linkedRequisitionLine?.approvedQuantity ?? 0) /
            rowData.item.defaultPackSize,
          2
        ),
      sortable: false,
    });
    columnDefinitions.push({
      key: 'approvalComment',
      label: 'label.approval-comment',
      sortable: false,
      accessor: ({ rowData }) => rowData.linkedRequisitionLine?.approvalComment,
    });
  }
  columnDefinitions.push(GenericColumnKey.Selection);

  const columns = useColumns<RequestLineFragment>(
    columnDefinitions,
    {
      onChangeSortBy: updateSortQuery,
      sortBy,
    },
    [updateSortQuery, sortBy]
  );

  return { columns, sortBy, onChangeSortBy: updateSortQuery };
};
