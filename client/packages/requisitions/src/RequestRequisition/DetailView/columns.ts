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
  NumUtils,
  ColumnDataAccessor,
  TooltipTextCell,
} from '@openmsupply-client/common';
import { useRequest } from '../api';
import {
  PackVariantQuantityCell,
  PackVariantSelectCell,
  usePackVariant,
} from '@openmsupply-client/system';

const useStockOnHand: ColumnDataAccessor<RequestLineFragment, string> = ({
  rowData,
}) => {
  const t = useTranslation();
  const formatNumber = useFormatNumber();
  const { itemStats } = rowData;
  const { availableStockOnHand, availableMonthsOfStockOnHand } = itemStats;
  const { numberOfPacksFromQuantity } = usePackVariant(rowData.itemId, null);

  const packQuantity = numberOfPacksFromQuantity(availableStockOnHand);

  const monthsString = availableMonthsOfStockOnHand
    ? `(${formatNumber.round(availableMonthsOfStockOnHand, 1)} ${t(
        'label.months',
        {
          count: availableMonthsOfStockOnHand,
        }
      )})`
    : '';
  return `${packQuantity} ${monthsString}`;
};

export const useRequestColumns = () => {
  const { maxMonthsOfStock } = useRequest.document.fields('maxMonthsOfStock');
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });
  const { usesRemoteAuthorisation } = useRequest.utils.isRemoteAuthorisation();

  const columnDefinitions: ColumnDescription<RequestLineFragment>[] = [
    getCommentPopoverColumn(),
    [
      'itemCode',
      {
        width: 130,
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
      key: 'packUnit',
      label: 'label.unit',
      align: ColumnAlign.Right,
      Cell: PackVariantSelectCell({
        getItemId: r => r.itemId,
        getUnitName: r => r.item.unitName || null,
      }),
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
      accessor: useStockOnHand,
      getSortValue: rowData => rowData.itemStats.availableStockOnHand,
    },
    [
      'monthlyConsumption',
      {
        width: 150,
        align: ColumnAlign.Right,
        Cell: PackVariantQuantityCell({
          getItemId: r => r.itemId,
          getQuantity: r =>
            NumUtils.round(r.itemStats.averageMonthlyConsumption),
        }),
        getSortValue: rowData => rowData.itemStats.averageMonthlyConsumption,
      },
    ],
    {
      key: 'targetStock',
      label: 'label.target-stock',
      align: ColumnAlign.Right,
      width: 150,
      Cell: PackVariantQuantityCell({
        getItemId: r => r.itemId,
        getQuantity: r =>
          NumUtils.round(
            r.itemStats.averageMonthlyConsumption * maxMonthsOfStock
          ),
      }),
      getSortValue: rowData =>
        rowData.itemStats.averageMonthlyConsumption * maxMonthsOfStock,
    },
    {
      key: 'suggestedQuantity',
      label: 'label.forecast-quantity',
      description: 'description.forecast-quantity',
      align: ColumnAlign.Right,
      width: 200,
      Cell: PackVariantQuantityCell({
        getItemId: r => r.itemId,
        getQuantity: r => NumUtils.round(r.suggestedQuantity),
      }),
      getSortValue: rowData => rowData.suggestedQuantity,
    },
    {
      key: 'requestedQuantity',
      label: 'label.requested-quantity',
      align: ColumnAlign.Right,
      width: 150,
      Cell: PackVariantQuantityCell({
        getItemId: r => r.itemId,
        getQuantity: r => NumUtils.round(r.requestedQuantity),
      }),
      getSortValue: rowData => rowData.requestedQuantity,
    },
  ];

  if (usesRemoteAuthorisation) {
    columnDefinitions.push({
      key: 'approvedNumPacks',
      label: 'label.approved-packs',
      align: ColumnAlign.Right,
      Cell: PackVariantQuantityCell({
        getItemId: r => r.itemId,
        getQuantity: r =>
          NumUtils.round(r.linkedRequisitionLine?.approvedQuantity ?? 0, 2),
      }),
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
