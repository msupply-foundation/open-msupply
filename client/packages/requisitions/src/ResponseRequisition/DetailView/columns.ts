/* eslint-disable new-cap */
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
import { PackSizeQuantityCell } from 'packages/system/src';

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
    {
      key: 'packUnit',
      label: 'label.unit',
      sortable: false,
      accessor: ({ rowData }) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return rowData.item.unitName;
      },
      width: 130,
    },
    [
      'stockOnHand',
      {
        label: 'label.our-soh',
        description: 'description.our-soh',
        sortable: false,
        Cell: PackSizeQuantityCell({
          getPackSize: _row => 1, // Default to units here, the result is not in pack size
          getQuantity: row => row.itemStats.availableStockOnHand,
        }),
      },
    ],
    {
      key: 'customerStockOnHand',
      label: 'label.customer-soh',
      description: 'description.customer-soh',
      width: 100,
      align: ColumnAlign.Right,
      getSortValue: rowData =>
        rowData.linkedRequisitionLine?.itemStats?.availableStockOnHand ?? '',
      Cell: PackSizeQuantityCell({
        getPackSize: _row => 1, // Default to units here, the result is not in pack size
        getQuantity: row =>
          row?.linkedRequisitionLine?.itemStats.availableStockOnHand ?? 0,
      }),
    },
    [
      'requestedQuantity',
      {
        getSortValue: rowData => rowData.requestedQuantity,
        Cell: PackSizeQuantityCell({
          getPackSize: _row => 1, // Default to units here, the result is not in pack size
          getQuantity: row => row.requestedQuantity ?? 0,
        }),
        width: 150,
      },
    ],
  ];

  if (isRemoteAuthorisation) {
    columnDefinitions.push({
      key: 'approvedQuantity',
      label: 'label.approved-quantity',
      sortable: false,
      Cell: PackSizeQuantityCell({
        getPackSize: _row => 1, // Default to units here, the result is not in pack size
        getQuantity: row => row.approvedQuantity,
      }),
    });
    columnDefinitions.push({
      key: 'approvalComment',
      label: 'label.approval-comment',
      sortable: false,
    });
  }

  columnDefinitions.push([
    'supplyQuantity',
    {
      getSortValue: rowData => rowData.supplyQuantity,
      Cell: PackSizeQuantityCell({
        getPackSize: _row => 1, // Default to units here, the result is not in pack size
        getQuantity: row => row.supplyQuantity,
      }),
    },
  ]);

  columnDefinitions.push({
    label: 'label.already-issued',
    description: 'description.already-issued',
    key: 'alreadyIssued',
    align: ColumnAlign.Right,
    getSortValue: rowData => rowData.alreadyIssued,
    Cell: PackSizeQuantityCell({
      getPackSize: _row => 1, // Default to units here, the result is not in pack size
      getQuantity: row => row.alreadyIssued,
    }),
    width: 100,
  });

  columnDefinitions.push({
    label: 'label.remaining-to-supply',
    description: 'description.remaining-to-supply',
    key: 'remainingToSupply',
    align: ColumnAlign.Right,
    getSortValue: rowData => rowData.remainingQuantityToSupply,
    Cell: PackSizeQuantityCell({
      getPackSize: _row => 1, // Default to units here, the result is not in pack size
      getQuantity: row => row.remainingQuantityToSupply,
    }),
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
