import {
  ColumnFormat,
  SortBy,
  useColumns,
  useFormatDateTime,
  useTranslation,
} from '@openmsupply-client/common';
import { LedgerRowFragment } from '../../api';
import {
  getInvoiceLocalisationKey,
  getNameValue,
} from '@openmsupply-client/system';

export enum ColumnKey {
  'DateTime' = 'datetime',
  'Time' = 'time',
  'Name' = 'name',
  'Quantity' = 'quantity',
  'Type' = 'type',
  'Reason' = 'reason',
  'Number' = 'number',
}

export const useLedgerColumns = (
  sortBy: SortBy<LedgerRowFragment>,
  updateSort: (sort: string, dir: 'asc' | 'desc') => void
) => {
  const t = useTranslation();
  const { localisedTime } = useFormatDateTime();

  const columns = useColumns<LedgerRowFragment>(
    [
      {
        key: ColumnKey.DateTime,
        label: 'label.date',
        format: ColumnFormat.Date,
        sortable: false,
      },
      {
        key: ColumnKey.Time,
        label: 'label.time',
        accessor: ({ rowData }) => localisedTime(rowData.datetime),
        sortable: false,
      },
      {
        key: ColumnKey.Name,
        label: 'label.name',
        accessor: ({ rowData }) => getNameValue(t, rowData.name),
        sortable: false,
      },
      {
        key: ColumnKey.Quantity,
        label: 'label.unit-quantity',
        sortable: false,
        description: 'description.unit-quantity',
      },
      {
        key: ColumnKey.Number,
        label: 'label.invoice-number',
        accessor: ({ rowData }) => rowData.invoiceNumber,
        sortable: false,
      },
      {
        key: ColumnKey.Type,
        label: 'label.type',
        accessor: ({ rowData }) =>
          t(getInvoiceLocalisationKey(rowData.invoiceType)),
        sortable: false,
      },
      {
        key: ColumnKey.Reason,
        label: 'label.reason',
        sortable: false,
      },
    ],
    {
      sortBy,
      onChangeSortBy: sort => {
        updateSort(
          sort,
          sort === sortBy.key
            ? sortBy.direction === 'asc'
              ? 'desc'
              : 'asc'
            : 'desc'
        );
      },
    },
    [sortBy]
  );

  return { columns };
};
