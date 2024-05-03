/* eslint-disable new-cap */
import {
  useColumns,
  GenericColumnKey,
  ColumnAlign,
  getCommentPopoverColumn,
  useUrlQueryParams,
  ColumnDescription,
  NumUtils,
  TooltipTextCell,
} from '@openmsupply-client/common';
import { ResponseLineFragment, useResponse } from './../api';
import {
  PackVariantQuantityCell,
  usePackVariant,
  useIsPackVariantsEnabled,
} from '@openmsupply-client/system';

export const useResponseColumns = () => {
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });
  const { isRemoteAuthorisation } = useResponse.utils.isRemoteAuthorisation();
  const isPackVariantsEnabled = useIsPackVariantsEnabled();

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
      label: isPackVariantsEnabled ? 'label.pack' : 'label.unit',
      sortable: false,
      accessor: ({ rowData }) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { variantsControl } = usePackVariant(
          rowData.item.id,
          rowData.item.unitName ?? null
        );

        if (variantsControl) return variantsControl.activeVariant.longName;
        else return rowData.item.unitName;
      },
      width: 130,
    },
    [
      'stockOnHand',
      {
        label: 'label.our-soh',
        description: 'description.our-soh',
        sortable: false,
        Cell: PackVariantQuantityCell({
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
      Cell: PackVariantQuantityCell({
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
        Cell: PackVariantQuantityCell({
          getItemId: row => row.itemId,
          getQuantity: row => NumUtils.round(row.requestedQuantity ?? 0),
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
      Cell: PackVariantQuantityCell({
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
      Cell: PackVariantQuantityCell({
        getItemId: row => row.itemId,
        getQuantity: row => NumUtils.round(row.supplyQuantity),
      }),
    },
  ]);

  columnDefinitions.push({
    label: 'label.already-issued',
    description: 'description.already-issued',
    key: 'alreadyIssued',
    align: ColumnAlign.Right,
    getSortValue: rowData => rowData.alreadyIssued,
    Cell: PackVariantQuantityCell({
      getItemId: row => row.itemId,
      getQuantity: row => NumUtils.round(row.alreadyIssued),
    }),
    width: 100,
  });

  columnDefinitions.push({
    label: 'label.remaining-to-supply',
    description: 'description.remaining-to-supply',
    key: 'remainingToSupply',
    align: ColumnAlign.Right,
    getSortValue: rowData => rowData.remainingQuantityToSupply,
    Cell: PackVariantQuantityCell({
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
