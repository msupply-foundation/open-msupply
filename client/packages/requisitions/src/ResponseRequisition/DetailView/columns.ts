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
  const { programName, linkedRequisition } = useResponse.document.fields([
    'programName',
    'linkedRequisition',
  ]);
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
          getQuantity: row => row.itemStats.availableStockOnHand,
        }),
      },
    ],
  ];

  if (!programName) {
    columnDefinitions.push({
      key: 'customerStockOnHand',
      label: 'label.customer-soh',
      description: 'description.customer-soh',
      width: 100,
      align: ColumnAlign.Right,
      getSortValue: rowData =>
        linkedRequisition
          ? (rowData.linkedRequisitionLine?.itemStats?.availableStockOnHand ??
            0)
          : rowData.availableStockOnHand,
      Cell: PackVariantQuantityCell({
        getItemId: row => row.itemId,
        getQuantity: row =>
          linkedRequisition
            ? (row.linkedRequisitionLine?.itemStats?.availableStockOnHand ?? 0)
            : row.availableStockOnHand,
      }),
    });
  }
  columnDefinitions.push(
    // TODO: Global pref to show/hide the next columns
    {
      key: 'initialStockOnHand',
      label: 'label.initial-stock-on-hand',
      width: 100,
      align: ColumnAlign.Right,
      sortable: false,
      description: 'description.initial-stock-on-hand',
      Cell: PackVariantQuantityCell({
        getItemId: row => row.itemId,
        getQuantity: row => row.initialStockOnHandUnits,
      }),
    },
    {
      key: 'incomingStock',
      label: 'label.incoming',
      width: 100,
      align: ColumnAlign.Right,
      sortable: false,
      Cell: PackVariantQuantityCell({
        getItemId: row => row.itemId,
        getQuantity: row => row.incomingUnits,
      }),
    },
    {
      key: 'outgoingUnits',
      label: 'label.outgoing',
      width: 100,
      align: ColumnAlign.Right,
      sortable: false,
      Cell: PackVariantQuantityCell({
        getItemId: row => row.itemId,
        getQuantity: row => row.outgoingUnits,
      }),
    },
    {
      key: 'losses',
      label: 'label.losses',
      width: 100,
      align: ColumnAlign.Right,
      sortable: false,
      Cell: PackVariantQuantityCell({
        getItemId: row => row.itemId,
        getQuantity: row => row.lossInUnits,
      }),
    },
    {
      key: 'additions',
      label: 'label.additions',
      width: 100,
      align: ColumnAlign.Right,
      sortable: false,
      Cell: PackVariantQuantityCell({
        getItemId: row => row.itemId,
        getQuantity: row => row.additionInUnits,
      }),
    },
    {
      key: 'availableUnits',
      label: 'label.available',
      width: 100,
      align: ColumnAlign.Right,
      sortable: false,
      description: 'description.available-stock',
      Cell: PackVariantQuantityCell({
        getItemId: row => row.itemId,
        getQuantity: row =>
          (linkedRequisition
            ? row.itemStats.availableStockOnHand
            : row.availableStockOnHand) +
          row.incomingUnits +
          row.additionInUnits -
          row.lossInUnits -
          row.outgoingUnits,
      }),
    },
    {
      key: 'expiringUnits',
      label: 'label.short-expiry',
      width: 100,
      align: ColumnAlign.Right,
      sortable: false,
      Cell: PackVariantQuantityCell({
        getItemId: row => row.itemId,
        getQuantity: row => row.expiringUnits,
      }),
    },
    {
      key: 'daysOutOfStock',
      label: 'label.days-out-of-stock',
      width: 100,
      align: ColumnAlign.Right,
      sortable: false,
      Cell: PackVariantQuantityCell({
        getItemId: row => row.itemId,
        getQuantity: row => row.daysOutOfStock,
      }),
    },
    {
      key: 'amc',
      label: 'label.amc',
      width: 100,
      align: ColumnAlign.Right,
      sortable: false,
      Cell: PackVariantQuantityCell({
        getItemId: row => row.itemId,
        getQuantity: row =>
          linkedRequisition
            ? (row.linkedRequisitionLine?.itemStats.averageMonthlyConsumption ??
              0)
            : row.averageMonthlyConsumption,
      }),
    },
    {
      key: 'mos',
      label: 'label.months-of-stock',
      width: 100,
      align: ColumnAlign.Right,
      sortable: false,
      Cell: PackVariantQuantityCell({
        getItemId: row => row.itemId,
        getQuantity: row =>
          (() => {
            const availableStock = linkedRequisition
              ? (row.linkedRequisitionLine?.itemStats?.availableStockOnHand ??
                0)
              : row.availableStockOnHand +
                row.incomingUnits +
                row.additionInUnits -
                row.lossInUnits -
                row.outgoingUnits;

            const averageMonthlyConsumption = linkedRequisition
              ? (row.linkedRequisitionLine?.itemStats
                  .averageMonthlyConsumption ?? 0)
              : row.averageMonthlyConsumption;

            return averageMonthlyConsumption !== 0
              ? availableStock / averageMonthlyConsumption
              : 0;
          })(),
      }),
    },
    {
      key: 'suggestedQuantity',
      label: 'label.suggested-quantity',
      width: 150,
      align: ColumnAlign.Right,
      sortable: false,
      Cell: PackVariantQuantityCell({
        getItemId: row => row.itemId,
        getQuantity: row => row.suggestedQuantity,
      }),
    },
    [
      'requestedQuantity',
      {
        getSortValue: rowData => rowData.requestedQuantity,
        Cell: PackVariantQuantityCell({
          getItemId: row => row.itemId,
          getQuantity: row => row.requestedQuantity ?? 0,
        }),
        width: 150,
      },
    ]
  );

  if (isRemoteAuthorisation) {
    columnDefinitions.push({
      key: 'approvedQuantity',
      label: 'label.approved-quantity',
      sortable: false,
      Cell: PackVariantQuantityCell({
        getItemId: row => row.itemId,
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
      Cell: PackVariantQuantityCell({
        getItemId: row => row.itemId,
        getQuantity: row => row.supplyQuantity,
      }),
    },
  ]);

  // TODO: Global pref to show/hide column
  columnDefinitions.push({
    key: 'reason',
    label: 'label.reason',
    sortable: false,
    accessor: ({ rowData }) => rowData.reason?.reason,
  });

  columnDefinitions.push({
    label: 'label.already-issued',
    description: 'description.already-issued',
    key: 'alreadyIssued',
    align: ColumnAlign.Right,
    getSortValue: rowData => rowData.alreadyIssued,
    Cell: PackVariantQuantityCell({
      getItemId: row => row.itemId,
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
    Cell: PackVariantQuantityCell({
      getItemId: row => row.itemId,
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
