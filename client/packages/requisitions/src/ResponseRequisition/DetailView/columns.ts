/* eslint-disable new-cap */
import {
  useColumns,
  GenericColumnKey,
  ColumnAlign,
  getCommentPopoverColumn,
  useUrlQueryParams,
  ColumnDescription,
  TooltipTextCell,
  getLinesFromRow,
} from '@openmsupply-client/common';
import { ResponseLineFragment, useResponse } from './../api';
import { PackQuantityCell } from '@openmsupply-client/system';
import { useResponseRequisitionLineErrorContext } from '../context';

export const useResponseColumns = () => {
  const { getError } = useResponseRequisitionLineErrorContext();

  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });
  const { isRemoteAuthorisation } = useResponse.utils.isRemoteAuthorisation();
  const { programName } = useResponse.document.fields(['programName']);

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
        Cell: PackQuantityCell,
        accessor: ({ rowData }) => rowData.itemStats.availableStockOnHand,
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
      Cell: PackQuantityCell,
      getSortValue: rowData => rowData.availableStockOnHand,
      accessor: ({ rowData }) => rowData.availableStockOnHand,
    });
  }
  if (programName) {
    columnDefinitions.push(
      // TODO: Global pref to show/hide the next columns
      {
        key: 'initialStockOnHand',
        label: 'label.initial-stock-on-hand',
        width: 100,
        align: ColumnAlign.Right,
        sortable: false,
        description: 'description.initial-stock-on-hand',
        Cell: PackQuantityCell,
        accessor: ({ rowData }) => rowData.initialStockOnHandUnits,
      },
      {
        key: 'incomingStock',
        label: 'label.incoming',
        width: 100,
        align: ColumnAlign.Right,
        sortable: false,
        Cell: PackQuantityCell,
        accessor: ({ rowData }) => rowData.incomingUnits,
      },
      {
        key: 'outgoingUnits',
        label: 'label.outgoing',
        width: 100,
        align: ColumnAlign.Right,
        sortable: false,
        Cell: PackQuantityCell,
        accessor: ({ rowData }) => rowData.outgoingUnits,
      },
      {
        key: 'losses',
        label: 'label.losses',
        width: 100,
        align: ColumnAlign.Right,
        sortable: false,
        Cell: PackQuantityCell,
        accessor: ({ rowData }) => rowData.lossInUnits,
      },
      {
        key: 'additions',
        label: 'label.additions',
        width: 100,
        align: ColumnAlign.Right,
        sortable: false,
        Cell: PackQuantityCell,
        accessor: ({ rowData }) => rowData.additionInUnits,
      },
      {
        key: 'availableUnits',
        label: 'label.available',
        width: 100,
        align: ColumnAlign.Right,
        sortable: false,
        description: 'description.available-stock',
        Cell: PackQuantityCell,
        accessor: ({ rowData }) => {
          const stockOnHand = rowData.initialStockOnHandUnits;

          const incomingStock = rowData.incomingUnits + rowData.additionInUnits;
          const outgoingStock = rowData.lossInUnits + rowData.outgoingUnits;

          return stockOnHand + incomingStock - outgoingStock;
        },
      },
      {
        key: 'expiringUnits',
        label: 'label.short-expiry',
        width: 100,
        align: ColumnAlign.Right,
        sortable: false,
        Cell: PackQuantityCell,
        accessor: ({ rowData }) => rowData.expiringUnits,
      },
      {
        key: 'daysOutOfStock',
        label: 'label.days-out-of-stock',
        width: 100,
        align: ColumnAlign.Right,
        sortable: false,
        Cell: PackQuantityCell,
        accessor: ({ rowData }) => rowData.daysOutOfStock,
      },
      {
        key: 'amc',
        label: 'label.amc',
        width: 100,
        align: ColumnAlign.Right,
        sortable: false,
        Cell: PackQuantityCell,
        accessor: ({ rowData }) => rowData.averageMonthlyConsumption,
      },
      {
        key: 'mos',
        label: 'label.months-of-stock',
        width: 100,
        align: ColumnAlign.Right,
        sortable: false,
        Cell: PackQuantityCell,
        accessor: ({ rowData }) => {
          const stockOnHand = rowData.initialStockOnHandUnits;
          const incomingStock = rowData.incomingUnits + rowData.additionInUnits;
          const outgoingStock = rowData.lossInUnits + rowData.outgoingUnits;

          const available = stockOnHand + incomingStock - outgoingStock;

          const averageMonthlyConsumption = rowData.averageMonthlyConsumption;

          return averageMonthlyConsumption !== 0
            ? available / averageMonthlyConsumption
            : 0;
        },
      }
    );
  }

  columnDefinitions.push(
    {
      key: 'suggestedQuantity',
      label: 'label.suggested-quantity',
      width: 150,
      align: ColumnAlign.Right,
      sortable: false,
      Cell: PackQuantityCell,
      accessor: ({ rowData }) => rowData.suggestedQuantity,
    },
    [
      'requestedQuantity',
      {
        getSortValue: rowData => rowData.requestedQuantity,
        Cell: PackQuantityCell,
        accessor: ({ rowData }) => rowData.requestedQuantity,
        width: 150,
      },
    ]
  );

  if (isRemoteAuthorisation) {
    columnDefinitions.push({
      key: 'approvedQuantity',
      label: 'label.approved-quantity',
      sortable: false,
      Cell: PackQuantityCell,
      accessor: ({ rowData }) => rowData.approvedQuantity,
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
      Cell: PackQuantityCell,
      accessor: ({ rowData }) => rowData.requestedQuantity,
    },
  ]);

  // TODO: Global pref to show/hide column
  if (programName) {
    columnDefinitions.push({
      key: 'reason',
      label: 'label.reason',
      sortable: false,
      getIsError: row =>
        getLinesFromRow(row).some(
          r => getError(r)?.__typename === 'RequisitionReasonNotProvided'
        ),
      accessor: ({ rowData }) => rowData.reason?.reason,
    });
  }

  columnDefinitions.push({
    label: 'label.already-issued',
    description: 'description.already-issued',
    key: 'alreadyIssued',
    align: ColumnAlign.Right,
    getSortValue: rowData => rowData.alreadyIssued,
    Cell: PackQuantityCell,
    accessor: ({ rowData }) => rowData.alreadyIssued,
    width: 100,
  });

  columnDefinitions.push({
    label: 'label.remaining-to-supply',
    description: 'description.remaining-to-supply',
    key: 'remainingToSupply',
    align: ColumnAlign.Right,
    getSortValue: rowData => rowData.remainingQuantityToSupply,
    Cell: PackQuantityCell,
    accessor: ({ rowData }) => rowData.remainingQuantityToSupply,
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
