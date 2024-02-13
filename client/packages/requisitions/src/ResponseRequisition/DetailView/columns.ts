import {
  useColumns,
  GenericColumnKey,
  ColumnAlign,
  getCommentPopoverColumn,
  useUrlQueryParams,
  ColumnDescription,
  TooltipTextCell,
} from '@openmsupply-client/common';
import { ResponseLineFragment, useResponse } from './../api';

export const useResponseColumns = () => {
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });
  const { isRemoteAuthorisation } = useResponse.utils.isRemoteAuthorisation();
  const columnDefinitions: ColumnDescription<ResponseLineFragment>[] = [
    getCommentPopoverColumn(),
    [
      'itemCode',
      {
        accessor: ({ rowData }) => rowData.item.code,
        getSortValue: rowData => rowData.item.code,
        width: 125,
      },
    ],
    [
      'itemName',
      {
        Cell: TooltipTextCell,
        accessor: ({ rowData }) => rowData.item.name,
        getSortValue: rowData => rowData.item.name,
      },
    ],
    [
      'itemUnit',
      {
        accessor: ({ rowData }) => rowData.item.unitName,
        getSortValue: rowData => rowData.item.unitName ?? '',
      },
    ],
    [
      'stockOnHand',
      {
        accessor: ({ rowData }) => rowData.itemStats.availableStockOnHand,
        getSortValue: rowData => rowData.itemStats.availableStockOnHand,
        label: 'label.our-soh',
        description: 'description.our-soh',
      },
    ],
    {
      key: 'customerStockOnHand',
      accessor: ({ rowData }) =>
        rowData.linkedRequisitionLine?.itemStats?.availableStockOnHand,
      getSortValue: rowData =>
        rowData.linkedRequisitionLine?.itemStats?.availableStockOnHand ?? '',

      label: 'label.customer-soh',
      description: 'description.customer-soh',
      width: 100,
      align: ColumnAlign.Right,
    },
    [
      'requestedQuantity',
      { getSortValue: rowData => rowData.requestedQuantity },
    ],
  ];

  if (isRemoteAuthorisation) {
    columnDefinitions.push({
      key: 'approvedQuantity',
      label: 'label.approved-quantity',
      sortable: false,
    });
    columnDefinitions.push({
      key: 'approvalComment',
      label: 'label.approval-comment',
      sortable: false,
    });
  }

  columnDefinitions.push([
    'supplyQuantity',
    { getSortValue: rowData => rowData.supplyQuantity },
  ]);
  columnDefinitions.push({
    label: 'label.remaining-to-supply',
    description: 'description.remaining-to-supply',
    key: 'remainingToSupply',
    align: ColumnAlign.Right,
    accessor: ({ rowData }) => rowData.remainingQuantityToSupply,
    getSortValue: rowData => rowData.remainingQuantityToSupply,
  });
  columnDefinitions.push(GenericColumnKey.Selection);

  const columns = useColumns<ResponseLineFragment>(
    columnDefinitions,
    {
      onChangeSortBy: updateSortQuery,
      sortBy,
    },
    [updateSortQuery, sortBy]
  );

  return { columns, sortBy, onChangeSortBy: updateSortQuery };
};
