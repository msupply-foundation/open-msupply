import React, { useMemo } from 'react';
import { RequestLineFragment } from '../api';
import {
  useAuthContext,
  usePluginProvider,
  UNDEFINED_STRING_VALUE,
  usePreferences,
  ColumnDef,
  useTranslation,
  ColumnType,
  UnitsAndDosesCell,
} from '@openmsupply-client/common';
import { useRequest } from '../api';
import { useRequestRequisitionLineErrorContext } from '../context';

export const useRequestColumns = () => {
  const t = useTranslation();
  const { maxMonthsOfStock, programName } = useRequest.document.fields([
    'maxMonthsOfStock',
    'programName',
  ]);
  const { usesRemoteAuthorisation } = useRequest.utils.isRemoteAuthorisation();
  const { store } = useAuthContext();
  const { errors } = useRequestRequisitionLineErrorContext();
  const { plugins } = usePluginProvider();
  const {
    manageVaccinesInDoses,
    warningForExcessRequest,
    showIndicativePriceInRequisitions,
  } = usePreferences();

  const showExtraColumns =
    !!programName &&
    store?.preferences.useConsumptionAndStockFromCustomersForInternalOrders;

  const columns = useMemo(
    (): ColumnDef<RequestLineFragment>[] => [
      {
        accessorKey: 'comment',
        header: t('label.comment'),
        columnType: ColumnType.Comment,
        pin: 'left',
      },
      {
        accessorKey: 'item.code',
        header: t('label.code'),
        pin: 'left',
        size: 140,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'itemName',
        header: t('label.name'),
        size: 250,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: 'packUnit',
        header: t('label.unit'),
        accessorFn: row => row.item.unitName,
        size: 120,
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
        Cell: ({ row, ...props }) => {
          const showAlert =
            warningForExcessRequest &&
            row.original.requestedQuantity - row.original.suggestedQuantity >=
              1;
          return (
            <UnitsAndDosesCell row={row} {...props} showAlert={showAlert} />
          );
        },
        enableSorting: true,
      },
      {
        header: t('label.indicative-price-per-unit'),
        description: t('description.indicative-price-per-unit'),
        accessorKey: 'pricePerUnit',
        columnType: ColumnType.Currency,
        includeColumn: showIndicativePriceInRequisitions,
      },
      {
        header: t('label.indicative-price'),
        description: t('description.indicative-price'),
        accessorFn: row => row.requestedQuantity * (row?.pricePerUnit || 0),
        columnType: ColumnType.Currency,
        includeColumn: showIndicativePriceInRequisitions,
      },

      // --- Extra consumption columns on program orders
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
        accessorKey: 'daysOutOfStock',
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
          errors?.[row.id]?.__typename === 'RequisitionReasonNotProvided',
      },

      // --- Remote authorisation columns
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

      // Plugin columns
      ...(plugins.requestRequisitionLine?.tableColumn || []),
    ],
    [
      manageVaccinesInDoses,
      warningForExcessRequest,
      showExtraColumns,
      usesRemoteAuthorisation,
      showIndicativePriceInRequisitions,
      maxMonthsOfStock,
      plugins.requestRequisitionLine?.tableColumn,
      errors,
    ]
  );

  return columns;
};
