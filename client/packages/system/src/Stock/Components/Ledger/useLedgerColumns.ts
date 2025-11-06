import { useMemo } from 'react';
import {
  ColumnDef,
  ColumnType,
  useTranslation,
  useFormatDateTime,
} from '@openmsupply-client/common';
import {
  getInvoiceLocalisationKey,
  getNameValue,
} from '@openmsupply-client/system';
import { LedgerRowFragment } from '../../api';

export enum ColumnKey {
  DateTime = 'datetime',
  Time = 'time',
  Name = 'name',
  Quantity = 'quantity',
  Type = 'type',
  Reason = 'reason',
  Number = 'number',
  Balance = 'runningBalance',
}

export const useLedgerColumns = () => {
  const t = useTranslation();
  const { localisedTime } = useFormatDateTime();

  return useMemo<ColumnDef<LedgerRowFragment>[]>(
    () => [
      {
        accessorKey: ColumnKey.DateTime,
        header: t('label.date'),
        columnType: ColumnType.Date,
        enableSorting: true,
        size: 100,
      },
      {
        accessorKey: ColumnKey.Time,
        header: t('label.time'),
        accessorFn: row => localisedTime(row.datetime),
        enableSorting: true,
        size: 80,
      },
      {
        accessorKey: ColumnKey.Name,
        header: t('label.name'),
        accessorFn: row => getNameValue(t, row.name),
        enableSorting: true,
      },
      {
        accessorKey: ColumnKey.Quantity,
        header: t('label.unit-quantity'),
        columnType: ColumnType.Number,
        enableSorting: true,
      },
      {
        accessorKey: ColumnKey.Balance,
        header: t('label.balance'),
        columnType: ColumnType.Number,
        enableSorting: true,
      },
      {
        accessorKey: ColumnKey.Type,
        header: t('label.type'),
        accessorFn: row =>
          `${t(getInvoiceLocalisationKey(row.invoiceType))} #${row.invoiceNumber}`,
        enableSorting: true,
      },
      {
        accessorKey: ColumnKey.Reason,
        header: t('label.reason'),
        enableSorting: true,
      },
    ],
    [getInvoiceLocalisationKey]
  );
};
