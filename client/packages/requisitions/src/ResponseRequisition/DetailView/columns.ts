import {
  useColumns,
  GenericColumnKey,
  ColumnAlign,
  getCommentPopoverColumn,
  useUrlQueryParams,
  ColumnDescription,
  NumUtils,
} from '@openmsupply-client/common';
import { ResponseLineFragment, useResponse } from './../api';
import {
  getPackUnitQuantityCell,
  useUnitVariant,
} from '@openmsupply-client/system';

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
      },
    ],
    [
      'itemName',
      {
        accessor: ({ rowData }) => rowData.item.name,
        getSortValue: rowData => rowData.item.name,
      },
    ],
    {
      key: 'packUnit',
      label: 'label.pack',
      sortable: false,
      accessor: ({ rowData }) => {
        const { variantsControl } = useUnitVariant(
          rowData.item.id,
          rowData.item.unitName ?? null
        );

        if (variantsControl) return variantsControl.activeVariant.longName;
        else return rowData.item.unitName;
      },
    },
    [
      'stockOnHand',
      {
        label: 'label.our-soh',
        description: 'description.our-soh',
        sortable: false,
        Cell: getPackUnitQuantityCell({
          getItemId: row => row.itemId,
          getQuantity: row =>
            NumUtils.round(row.itemStats.availableStockOnHand),
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
      Cell: getPackUnitQuantityCell({
        getItemId: row => row.itemId,
        getQuantity: row =>
          NumUtils.round(
            row?.linkedRequisitionLine?.itemStats.availableStockOnHand ?? 0
          ),
      }),
    },
    [
      'requestedQuantity',
      {
        getSortValue: rowData => rowData.requestedQuantity,
        Cell: getPackUnitQuantityCell({
          getItemId: row => row.itemId,
          getQuantity: row => NumUtils.round(row.requestedQuantity ?? 0),
        }),
      },
    ],
  ];

  if (isRemoteAuthorisation) {
    columnDefinitions.push({
      key: 'approvedQuantity',
      label: 'label.approved-quantity',
      sortable: false,
      Cell: getPackUnitQuantityCell({
        getItemId: row => row.itemId,
        getQuantity: row => NumUtils.round(row.approvedQuantity),
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
      Cell: getPackUnitQuantityCell({
        getItemId: row => row.itemId,
        getQuantity: row => NumUtils.round(row.supplyQuantity),
      }),
    },
  ]);
  columnDefinitions.push({
    label: 'label.remaining-to-supply',
    description: 'description.remaining-to-supply',
    key: 'remainingToSupply',
    width: 100,
    align: ColumnAlign.Right,
    getSortValue: rowData => rowData.remainingQuantityToSupply,
    Cell: getPackUnitQuantityCell({
      getItemId: row => row.itemId,
      getQuantity: row => NumUtils.round(row.remainingQuantityToSupply),
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
