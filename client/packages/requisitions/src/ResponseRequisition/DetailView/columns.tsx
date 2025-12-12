/* eslint-disable new-cap */
import {
  useAuthContext,
  getLinesFromRow,
  UNDEFINED_STRING_VALUE,
  usePreferences,
  ColumnDef,
  useTranslation,
  ColumnType,
  UnitsAndDosesCell,
} from '@openmsupply-client/common';
import { ResponseLineFragment, useResponse } from '../api';
import { useResponseRequisitionLineErrorContext } from '../context';
import { useMemo } from 'react';
import React from 'react';

export const useResponseColumns = () => {
  const t = useTranslation();

  const { getError } = useResponseRequisitionLineErrorContext();
  const {
    manageVaccinesInDoses,
    warningForExcessRequest,
    showIndicativePriceInRequisitions,
  } = usePreferences();

  const { store } = useAuthContext();
  const { isRemoteAuthorisation } = useResponse.utils.isRemoteAuthorisation();
  const { programName } = useResponse.document.fields(['programName']);

  const showExtraProgramColumns =
    !!programName && store?.preferences?.extraFieldsInRequisition;

  const columns = useMemo(
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
        pin: 'left',
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
        header: t('label.indicative-price'),
        description: t('description.indicative-price'),
        accessorFn: row => row.requestedQuantity * (row?.pricePerUnit || 0),
        columnType: ColumnType.Currency,
        includeColumn: showIndicativePriceInRequisitions,
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
        enableSorting: true,
      },
      {
        id: 'reason',
        header: t('label.reason'),
        accessorFn: row => row.reason?.reason ?? '',
        includeColumn: showExtraProgramColumns,
        getIsError: row =>
          getLinesFromRow(row).some(
            r => getError(r)?.__typename === 'RequisitionReasonNotProvided'
          ),
      },
      {
        accessorKey: 'alreadyIssued',
        header: t('label.already-issued'),
        description: t('description.already-issued'),
        size: 100,
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        enableSorting: true,
      },
      {
        accessorKey: 'remainingQuantityToSupply',
        header: t('label.remaining-to-supply'),
        description: t('description.remaining-to-supply'),
        size: 100,
        columnType: ColumnType.Number,
        Cell: UnitsAndDosesCell,
        enableSorting: true,
      },
    ],
    [
      isRemoteAuthorisation,
      manageVaccinesInDoses,
      programName,
      showExtraProgramColumns,
      showIndicativePriceInRequisitions,
      warningForExcessRequest,
      getError,
    ]
  );

  return { columns };
};
