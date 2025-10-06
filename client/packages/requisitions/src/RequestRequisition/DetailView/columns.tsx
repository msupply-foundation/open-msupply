import React, { useMemo } from 'react';
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
  usePreferences,
  UnitsAndMaybeDoses,
  CellProps,
  ColumnDef,
  useTranslation,
  ColumnType,
  UnitsAndDosesCell,
} from '@openmsupply-client/common';
import { useRequest } from '../api';
import { NumericCell, PackQuantityCell } from '@openmsupply-client/system';
import { useRequestRequisitionLineErrorContext } from '../context';

export const useRequestColumns = () => {
  const t = useTranslation();
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
  const { manageVaccinesInDoses } = usePreferences();

  const showExtraColumns =
    !!programName &&
    (store?.preferences.useConsumptionAndStockFromCustomersForInternalOrders ??
      true);

  const columnDefinitions: ColumnDescription<RequestLineFragment>[] = [
    GenericColumnKey.Selection,
    getCommentPopoverColumn(),
  ];

  if (showExtraColumns) {
    columnDefinitions.push(
      // TODO: Global pref to show/hide the next columns
      {
        key: 'initialStockOnHand',
        label: 'label.initial-stock-on-hand',
        width: 100,
        align: ColumnAlign.Right,
        sortable: false,
        description: 'description.initial-stock-on-hand',
        Cell: UnitsAndMaybeDosesCell,
        accessor: ({ rowData }) => rowData.initialStockOnHandUnits,
      },
      {
        key: 'incomingStock',
        label: 'label.incoming',
        width: 100,
        align: ColumnAlign.Right,
        sortable: false,
        Cell: UnitsAndMaybeDosesCell,
        accessor: ({ rowData }) => rowData.incomingUnits,
      },
      {
        key: 'outgoingUnits',
        label: 'label.outgoing',
        width: 100,
        align: ColumnAlign.Right,
        sortable: false,
        Cell: UnitsAndMaybeDosesCell,
        accessor: ({ rowData }) => rowData.outgoingUnits,
      },
      {
        key: 'losses',
        label: 'label.losses',
        width: 100,
        align: ColumnAlign.Right,
        sortable: false,
        Cell: UnitsAndMaybeDosesCell,
        accessor: ({ rowData }) => rowData.lossInUnits,
      },
      {
        key: 'additions',
        label: 'label.additions',
        width: 100,
        align: ColumnAlign.Right,
        sortable: false,
        Cell: UnitsAndMaybeDosesCell,
        accessor: ({ rowData }) => rowData.additionInUnits,
      },
      {
        key: 'expiringUnits',
        label: 'label.short-expiry',
        width: 100,
        align: ColumnAlign.Right,
        sortable: false,
        Cell: UnitsAndMaybeDosesCell,
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
      getSortValue: rowData =>
        rowData.linkedRequisitionLine?.approvedQuantity ?? 0,
    });
    columnDefinitions.push({
      key: 'approvalComment',
      label: 'label.approval-comment',
      sortable: false,
      accessor: ({ rowData }) => rowData.linkedRequisitionLine?.approvalComment,
    });
  }

  // ...(plugins.requestRequisitionLine?.tableColumn || []),
  const columns = useMemo(
    (): ColumnDef<RequestLineFragment>[] => [
      {
        accessorKey: 'comment',
        header: t('label.comment'),
        columnType: ColumnType.Comment,
      },
      {
        accessorKey: 'item.code',
        header: t('label.code'),
        pin: 'left',
        enableSorting: true,
      },
      { accessorKey: 'itemName', header: t('label.name'), enableSorting: true },
      {
        id: 'packUnit',
        header: t('label.unit'),
        accessorFn: row => row.item.unitName,
        defaultHideOnMobile: true,
      },
      {
        id: 'dosesPerUnit',
        header: t('label.doses-per-unit'),
        accessorFn: row =>
          row.item?.isVaccine ? row.item.doses : UNDEFINED_STRING_VALUE,
        columnType: ColumnType.Number,
        includeColumn: manageVaccinesInDoses,
      },
      {
        accessorKey: 'item.defaultPackSize',
        header: t('label.dps'),
        enableSorting: true,
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'itemStats.availableStockOnHand',
        header: t('label.available-soh'),
        description: t('description.available-soh'),
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        enableSorting: true,
      },
      {
        accessorKey: 'itemStats.averageMonthlyConsumption',
        header: t('label.amc'),
        description: t('description.average-monthly-consumption'),
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        enableSorting: true,
      },
      {
        accessorKey: 'itemStats.availableMonthsOfStockOnHand',
        header: t('label.months-of-stock'),
        description: t('description.available-months-of-stock'),
        columnType: ColumnType.Number,
        enableSorting: true,
      },
      {
        id: 'targetStock',
        header: t('label.target-stock'),
        description: t('description.target-stock'),
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        accessorFn: row =>
          row.itemStats.averageMonthlyConsumption * maxMonthsOfStock,
        enableSorting: true,
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'suggestedQuantity',
        header: t('label.forecast-quantity'),
        description: t('description.forecast-quantity'),
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        enableSorting: true,
      },
      {
        accessorKey: 'requestedQuantity',
        header: t('label.requested'),
        description: t('description.doses-quantity'),
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        enableSorting: true,
      },
      {
        accessorKey: 'initialStockOnHandUnits',
        header: t('label.initial-stock-on-hand'),
        description: t('description.initial-stock-on-hand'),
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        includeColumn: showExtraColumns,
      },
      {
        accessorKey: 'incomingUnits',
        header: t('label.incoming'),
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        includeColumn: showExtraColumns,
      },
      {
        accessorKey: 'outgoingUnits',
        header: t('label.outgoing'),
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        includeColumn: showExtraColumns,
      },
      {
        accessorKey: 'lossInUnits',
        header: t('label.losses'),
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        includeColumn: showExtraColumns,
      },
      {
        accessorKey: 'additionInUnits',
        header: t('label.additions'),
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        includeColumn: showExtraColumns,
      },
      {
        accessorKey: 'expiringUnits',
        header: t('label.short-expiry'),
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        includeColumn: showExtraColumns,
      },
      {
        accessorKey: 'daysOutOfStock', // todo - maybe default to 0, accessFN
        header: t('label.days-out-of-stock'),
        columnType: ColumnType.Number,
        includeColumn: showExtraColumns,
      },
      {
        id: 'reason',
        header: t('label.reason'),
        includeColumn: showExtraColumns,
        accessorFn: row => row.reason?.reason,
        getIsError: row =>
          // todo - prob less than this + include in deps
          getLinesFromRow(row).some(
            r => getError(r)?.__typename === 'RequisitionReasonNotProvided'
          ),
      },
      {
        id: 'approvedNumPacks',
        header: t('label.approved-packs'),
        columnType: ColumnType.Number,
        accessorFn: row => row.linkedRequisitionLine?.approvedQuantity ?? 0,
        includeColumn: usesRemoteAuthorisation,
        enableSorting: true,
      },
      {
        id: 'approvalComment',
        header: t('label.approval-comment'),
        accessorFn: row => row.linkedRequisitionLine?.approvalComment,
        includeColumn: usesRemoteAuthorisation,
      },
    ],
    [manageVaccinesInDoses, showExtraColumns]
  );

  return columns;
};

const UnitsAndMaybeDosesCell = (props: CellProps<RequestLineFragment>) => {
  const { rowData, column } = props;
  const units = Number(column.accessor({ rowData })) ?? 0;
  const { isVaccine, doses } = rowData.item;

  return (
    <UnitsAndMaybeDoses
      numberCellProps={{ ...props, decimalLimit: 0 }}
      units={units}
      isVaccine={isVaccine}
      dosesPerUnit={doses}
    />
  );
};
