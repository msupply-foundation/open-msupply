import { Column } from 'react-table';
import { Transaction } from './TransactionService';

export const getColumns = (
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
    Header: 'Customer',
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
