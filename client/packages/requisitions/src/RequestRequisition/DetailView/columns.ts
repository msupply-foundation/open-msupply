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
  ColumnDataAccessor,
  TooltipTextCell,
  useAuthContext,
  getLinesFromRow,
} from '@openmsupply-client/common';
import { useRequest } from '../api';
import { PackQuantityCell } from '@openmsupply-client/system';
import { useRequestRequisitionLineErrorContext } from '../context';

const useStockOnHand: ColumnDataAccessor<RequestLineFragment, string> = ({
  rowData,
}) => {
  const t = useTranslation();
  const formatNumber = useFormatNumber();
  const { itemStats } = rowData;
  const { availableStockOnHand, availableMonthsOfStockOnHand } = itemStats;

  const monthsString = availableMonthsOfStockOnHand
    ? `(${formatNumber.round(availableMonthsOfStockOnHand, 1)} ${t(
        'label.months',
        {
          count: availableMonthsOfStockOnHand,
        }
      )})`
    : '';
  return `${availableStockOnHand} ${monthsString}`;
};

export const useRequestColumns = () => {
  const { maxMonthsOfStock, programName } = useRequest.document.fields([
    'maxMonthsOfStock',
    'programName',
  ]);
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });
  const { usesRemoteAuthorisation } = useRequest.utils.isRemoteAuthorisation();
  const { store } = useAuthContext();
  const { getError } = useRequestRequisitionLineErrorContext();

  const columnDefinitions: ColumnDescription<RequestLineFragment>[] = [
    GenericColumnKey.Selection,
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
        accessor: ({ rowData }) => rowData.itemName,
        getSortValue: rowData => rowData.itemName,
      },
    ],
    {
      key: 'packUnit',
      label: 'label.unit',
      align: ColumnAlign.Right,
      accessor: ({ rowData }) => rowData.item.unitName,
      sortable: false,
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
        Cell: PackQuantityCell,
        accessor: ({ rowData }) => rowData.itemStats.averageMonthlyConsumption,
        getSortValue: rowData => rowData.itemStats.averageMonthlyConsumption,
      },
    ],
  ];

  if (
    programName &&
    store?.preferences.useConsumptionAndStockFromCustomersForInternalOrders
  ) {
    columnDefinitions.push({
      key: 'monthsOfStock',
      label: 'label.months-of-stock',
      description: 'description.months-of-stock',
      align: ColumnAlign.Right,
      width: 150,
      Cell: PackQuantityCell,
      accessor: ({ rowData }) => rowData.itemStats.availableMonthsOfStockOnHand,
    });
  }

  columnDefinitions.push(
    {
      key: 'targetStock',
      label: 'label.target-stock',
      align: ColumnAlign.Right,
      width: 150,
      Cell: PackQuantityCell,
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
      Cell: PackQuantityCell,
      getSortValue: rowData => rowData.suggestedQuantity,
    },
    {
      key: 'requestedQuantity',
      label: 'label.requested',
      align: ColumnAlign.Right,
      width: 150,
      Cell: PackQuantityCell,
      getSortValue: rowData => rowData.requestedQuantity,
    }
  );

  if (
    programName &&
    store?.preferences.useConsumptionAndStockFromCustomersForInternalOrders
  ) {
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
        key: 'reason',
        label: 'label.reason',
        sortable: false,
        getIsError: row =>
          getLinesFromRow(row).some(
            r => getError(r)?.__typename === 'RequisitionReasonNotProvided'
          ),
        accessor: ({ rowData }) => rowData.reason?.reason,
      }
    );
  }

  if (usesRemoteAuthorisation) {
    columnDefinitions.push({
      key: 'approvedNumPacks',
      label: 'label.approved-packs',
      align: ColumnAlign.Right,
      Cell: PackQuantityCell,
      accessor: ({ rowData }) =>
        rowData.linkedRequisitionLine?.approvedQuantity ?? 0,
      sortable: false,
    });
    columnDefinitions.push({
      key: 'approvalComment',
      label: 'label.approval-comment',
      sortable: false,
      accessor: ({ rowData }) => rowData.linkedRequisitionLine?.approvalComment,
    });
  }

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
