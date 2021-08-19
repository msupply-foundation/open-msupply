import { Column } from 'react-table';

export const columns: Column[] = [
  {
    Header: 'ID',
    accessor: 'id',
  },
  {
    Header: 'Date',
    accessor: 'date',
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
