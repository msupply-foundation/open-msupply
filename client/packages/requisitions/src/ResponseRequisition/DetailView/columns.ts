import {
  useColumns,
  GenericColumnKey,
  ColumnAlign,
  getCommentPopoverColumn,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { ResponseLineFragment } from './../api';

export const useResponseColumns = () => {
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });
  const columns = useColumns<ResponseLineFragment>(
    [
      getCommentPopoverColumn(),
      [
        'itemCode',
        {
          accessor: ({ rowData }) => rowData.item.code,
          getSortValue: rowData => rowData.item.code,
        },
      ],
      [
        'itemName',
        {
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
      ['supplyQuantity', { getSortValue: rowData => rowData.supplyQuantity }],
      {
        label: 'label.remaining-to-supply',
        description: 'description.remaining-to-supply',
        key: 'remainingToSupply',
        width: 100,
        align: ColumnAlign.Right,
        accessor: ({ rowData }) => rowData.remainingQuantityToSupply,
        getSortValue: rowData => rowData.remainingQuantityToSupply,
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
