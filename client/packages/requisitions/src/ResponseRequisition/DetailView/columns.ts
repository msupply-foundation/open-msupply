/* eslint-disable new-cap */
import {
  useColumns,
  GenericColumnKey,
  ColumnAlign,
  getCommentPopoverColumn,
  useUrlQueryParams,
  ColumnDescription,
  TooltipTextCell,
  useAuthContext,
  getLinesFromRow,
  UNDEFINED_STRING_VALUE,
  usePreferences,
  ColumnDef,
  useTranslation,
  ColumnType,
  UnitsAndDosesCell,
} from '@openmsupply-client/common';
import { ResponseLineFragment, useResponse } from './../api';
import { PackQuantityCell } from '@openmsupply-client/system';
import { useResponseRequisitionLineErrorContext } from '../context';
import { useMemo } from 'react';

export const useResponseColumns = () => {
  const t = useTranslation();

  const { getError } = useResponseRequisitionLineErrorContext();
  const { manageVaccinesInDoses } = usePreferences();

  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });
  const { store } = useAuthContext();
  const { isRemoteAuthorisation } = useResponse.utils.isRemoteAuthorisation();
  const { programName } = useResponse.document.fields(['programName']);

  const showExtraProgramColumns =
    !!programName && store?.preferences?.extraFieldsInRequisition;
  // const isRemoteAuthorisation = true;

  const newColumns = useMemo(
    (): ColumnDef<ResponseLineFragment>[] => [
      {
        accessorKey: 'comment',
        header: t('label.comment'),
        columnType: ColumnType.Comment,
        pin: 'left',
      },
      {
        accessorKey: 'item.code',
        header: t('label.code'),
        size: 100,
      },
      {
        accessorKey: 'item.name',
        header: t('label.name'),
        // Cell: TextWithTooltipCell,
        size: 250,
      },
      {
        accessorKey: 'item.unitName',
        header: t('label.unit'),
        enableColumnFilter: true,
        size: 130,
      },
      {
        id: 'dosesPerUnit',
        accessorFn: row =>
          row.item?.isVaccine ? row.item.doses : UNDEFINED_STRING_VALUE,
        header: t('label.doses-per-unit'),
        enableColumnFilter: true,
        size: 100,
        columnType: ColumnType.Number,
        includeColumn: manageVaccinesInDoses,
      },
      {
        accessorKey: 'itemStats.stockOnHand',
        header: t('label.our-soh'),
        description: t('description.our-soh'),
        size: 150,
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        enableSorting: true,
      },
      {
        accessorKey: 'availableStockOnHand',
        header: t('label.customer-soh'),
        description: t('description.customer-soh'),
        size: 150,
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        enableSorting: true,
        includeColumn: !programName,
      },
      // TODO: Global pref to show/hide the next columns
      {
        accessorKey: 'initialStockOnHandUnits',
        header: t('label.initial-stock-on-hand'),
        description: t('description.initial-stock-on-hand'),
        size: 100,
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        includeColumn: showExtraProgramColumns,
      },
      {
        accessorKey: 'incomingUnits',
        header: t('label.incoming'),
        size: 100,
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        includeColumn: showExtraProgramColumns,
      },
      {
        accessorKey: 'outgoingUnits',
        header: t('label.outgoing'),
        size: 100,
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        includeColumn: showExtraProgramColumns,
      },
      {
        accessorKey: 'lossInUnits',
        header: t('label.losses'),
        size: 100,
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        includeColumn: showExtraProgramColumns,
      },
      {
        accessorKey: 'additionInUnits',
        header: t('label.additions'),
        size: 100,
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        includeColumn: showExtraProgramColumns,
      },
      {
        id: 'availableUnits',
        accessorFn: row => {
          const stockOnHand = row.initialStockOnHandUnits;

          const incomingStock = row.incomingUnits + row.additionInUnits;
          const outgoingStock = row.lossInUnits + row.outgoingUnits;

          return stockOnHand + incomingStock - outgoingStock;
        },
        header: t('label.available'),
        description: t('description.available-stock'),
        size: 100,
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        includeColumn: showExtraProgramColumns,
      },
      {
        accessorKey: 'expiringUnits',
        header: t('label.short-expiry'),
        size: 100,
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        includeColumn: showExtraProgramColumns,
      },
      {
        accessorKey: 'daysOutOfStock',
        header: t('label.days-out-of-stock'),
        size: 100,
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        includeColumn: showExtraProgramColumns,
      },
      {
        accessorKey: 'averageMonthlyConsumption',
        header: t('label.amc'),
        size: 100,
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        includeColumn: showExtraProgramColumns,
      },
      {
        id: 'mos',
        accessorFn: row => {
          const stockOnHand = row.initialStockOnHandUnits;
          const incomingStock = row.incomingUnits + row.additionInUnits;
          const outgoingStock = row.lossInUnits + row.outgoingUnits;

          const available = stockOnHand + incomingStock - outgoingStock;

          const averageMonthlyConsumption = row.averageMonthlyConsumption;

          return averageMonthlyConsumption !== 0
            ? available / averageMonthlyConsumption
            : 0;
        },
        header: t('label.months-of-stock'),
        size: 100,
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        includeColumn: showExtraProgramColumns,
      },
      {
        accessorKey: 'suggestedQuantity',
        header: t('label.suggested'),
        size: 100,
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
      },
      {
        accessorKey: 'requestedQuantity',
        header: t('label.requested'),
        size: 100,
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        enableSorting: true,
      },
      {
        accessorKey: 'approvedQuantity',
        header: t('label.approved-quantity'),
        size: 100,
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        enableSorting: true,
        includeColumn: isRemoteAuthorisation,
      },
      {
        accessorKey: 'approvalComment',
        header: t('label.approval-comment'),
        includeColumn: isRemoteAuthorisation,
      },
      {
        accessorKey: 'supplyQuantity',
        header: t('label.supply-quantity'),
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
      },
      // TODO: Global pref to show/hide column
      {
        id: 'reason',
        header: t('label.reason'),
        accessorFn: row => row.reason?.reason ?? '',
        includeColumn: showExtraProgramColumns,
        // SHOW ERROR STATE?
      },
      {
        accessorKey: 'alreadyIssued',
        header: t('label.already-issued'),
        description: t('description.already-issued'),
        size: 100,
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
      },
      {
        accessorKey: 'remainingQuantityToSupply',
        header: t('label.remaining-to-supply'),
        description: t('description.remaining-to-supply'),
        size: 100,
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
      },
    ],
    [
      showExtraProgramColumns,
      isRemoteAuthorisation,
      t,
      manageVaccinesInDoses,
      programName,
    ]
  );

  const columnDefinitions: ColumnDescription<ResponseLineFragment>[] = [
    [
      GenericColumnKey.Selection,
      {
        getIsError: row =>
          getLinesFromRow(row).some(
            r => getError(r)?.__typename === 'CannotDeleteLineLinkedToShipment'
          ),
      },
    ],
    getCommentPopoverColumn(),
    [
      'itemCode',
      {
        accessor: ({ rowData }) => rowData.item.code,
        getSortValue: rowData => rowData.item.code,
        width: 125,
        isSticky: true,
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

  columnDefinitions.push([
    'availableStockOnHand',
    {
      label: 'label.our-soh',
      description: 'description.our-soh',
      sortable: false,
      Cell: PackQuantityCell,
      accessor: ({ rowData }) => rowData.itemStats.stockOnHand,
    },
  ]);

  if (!programName) {
    columnDefinitions.push({
      key: 'customerStockOnHand',
      label: 'label.customer-soh',
      description: 'description.customer-soh',
      width: 140,
      align: ColumnAlign.Right,
      Cell: PackQuantityCell,
      getSortValue: rowData => rowData.availableStockOnHand,
      accessor: ({ rowData }) => rowData.availableStockOnHand,
    });
  }
  if (programName && store?.preferences?.extraFieldsInRequisition) {
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
      label: 'label.suggested',
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
      sortable: true,
      Cell: PackQuantityCell,
      accessor: ({ rowData }) => rowData.approvedQuantity,
      getSortValue: rowData => rowData.approvedQuantity,
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
      accessor: ({ rowData }) => rowData.supplyQuantity,
    },
  ]);

  // TODO: Global pref to show/hide column
  if (programName && store?.preferences?.extraFieldsInRequisition) {
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

  const columns = useColumns<ResponseLineFragment>(
    columnDefinitions,
    {
      onChangeSortBy: updateSortQuery,
      sortBy,
    },
    [updateSortQuery, sortBy]
  );

  return { columns, sortBy, onChangeSortBy: updateSortQuery, newColumns };
};
