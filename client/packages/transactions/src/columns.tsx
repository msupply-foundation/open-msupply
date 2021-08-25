import { LocaleKey } from '@openmsupply-client/common/src/intl/intlHelpers';
import { Column } from 'react-table';
import { Transaction } from './TransactionService';
import type { PrimitiveType } from 'intl-messageformat';

export const getColumns = (
  t: (
    id?: LocaleKey, // only accepts valid keys, not any string
    values?: Record<string, PrimitiveType>
  ) => string,
  formatDate: (
    value: number | Date,
    options?: Intl.DateTimeFormatOptions & { format?: string }
  ) => string
): Column<Transaction>[] => [
  {
    Header: 'ID',
    accessor: 'id',
  },
  {
    Header: 'Date',
    accessor: (row: Transaction) => formatDate(new Date(row.date)),
  },
  {
    Header: t('label.customer'),
    accessor: 'customer',
  },
  {
    Header: 'Supplier',
    accessor: 'supplier',
  },
  {
    Header: 'Total',
    accessor: 'total',
  },
];
