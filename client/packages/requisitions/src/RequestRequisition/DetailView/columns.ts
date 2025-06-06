import { RequestLineFragment } from '../api';
import {
  ColumnAlign,
  useColumns,
  GenericColumnKey,
  getCommentPopoverColumn,
  useUrlQueryParams,
  ColumnDescription,
  TooltipTextCell,
  useAuthContext,
  getLinesFromRow,
  usePluginProvider,
  UNDEFINED_STRING_VALUE,
} from '@openmsupply-client/common';
import { useRequest } from '../api';
import { PackQuantityCell } from '@openmsupply-client/system';
import { useRequestRequisitionLineErrorContext } from '../context';

export const useRequestColumns = (manageVaccinesInDoses: boolean = false) => {
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
  const { plugins } = usePluginProvider();

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
      defaultHideOnMobile: true,
    },
  ];

  if (manageVaccinesInDoses) {
    columnDefinitions.push({
      key: 'dosesPerUnit',
      label: 'label.doses-per-unit',
      width: 100,
      align: ColumnAlign.Right,
      sortable: false,
      accessor: ({ rowData }) =>
        rowData.item?.isVaccine ? rowData.item.doses : UNDEFINED_STRING_VALUE,
    });
  }

  columnDefinitions.push(
    {
      key: 'defaultPackSize',
      label: 'label.dps',
      description: 'description.default-pack-size',
      align: ColumnAlign.Right,
      accessor: ({ rowData }) => rowData.item.defaultPackSize,
      getSortValue: rowData => rowData.item.defaultPackSize,
      defaultHideOnMobile: true,
    },
    {
      key: 'availableStockOnHand',
      label: 'label.available-soh',
      description: 'description.available-soh',
      align: ColumnAlign.Right,
      width: 200,
      accessor: ({ rowData }) => rowData.itemStats.availableStockOnHand,
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
    {
      key: 'monthsOfStock',
      label: 'label.months-of-stock',
      description: 'description.available-months-of-stock',
      align: ColumnAlign.Right,
      width: 150,
      Cell: PackQuantityCell,
      accessor: ({ rowData }) => rowData.itemStats.availableMonthsOfStockOnHand,
    }
  );

  columnDefinitions.push(
    {
      key: 'targetStock',
      label: 'label.target-stock',
      description: 'description.target-stock',
      align: ColumnAlign.Right,
      width: 150,
      Cell: PackQuantityCell,
      accessor: ({ rowData }) =>
        rowData.itemStats.averageMonthlyConsumption * maxMonthsOfStock,
      getSortValue: rowData =>
        rowData.itemStats.averageMonthlyConsumption * maxMonthsOfStock,
      defaultHideOnMobile: true,
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
    [
      ...columnDefinitions,
      ...(plugins.requestRequisitionLine?.tableColumn || []),
    ],
    {
      onChangeSortBy: updateSortQuery,
      sortBy,
    },
    [updateSortQuery, sortBy, plugins.requestRequisitionLine]
  );

  return { columns, sortBy, onChangeSortBy: updateSortQuery };
};
