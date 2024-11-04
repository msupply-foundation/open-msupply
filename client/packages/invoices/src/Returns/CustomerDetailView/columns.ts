import {
  useColumns,
  GenericColumnKey,
  SortBy,
  Column,
  TooltipTextCell,
  useColumnUtils,
  NumberCell,
  getRowExpandColumn,
  ArrayUtils,
  ColumnDescription,
} from '@openmsupply-client/common';
import { CustomerReturnLineFragment } from '../api';
import { CustomerReturnItem } from '../../types';

interface UseCustomerReturnColumnOptions {
  sortBy: SortBy<CustomerReturnLineFragment | CustomerReturnItem>;
  onChangeSortBy: (sort: string, dir: 'desc' | 'asc') => void;
}

const expansionColumn = getRowExpandColumn<
  CustomerReturnLineFragment | CustomerReturnItem
>();

const getUnitQuantity = (row: CustomerReturnLineFragment) =>
  row.packSize * row.numberOfPacks;

export const useCustomerReturnColumns = ({
  sortBy,
  onChangeSortBy,
}: UseCustomerReturnColumnOptions): Column<
  CustomerReturnLineFragment | CustomerReturnItem
>[] => {
  const { getColumnProperty, getColumnPropertyAsString } = useColumnUtils();

  const columns: ColumnDescription<
    CustomerReturnLineFragment | CustomerReturnItem
  >[] = [
    [
      'itemCode',
      {
        getSortValue: row =>
          getColumnPropertyAsString(row, [
            { path: ['lines', 'itemCode'] },
            { path: ['itemCode'], default: '' },
          ]),
        accessor: ({ rowData }) =>
          getColumnProperty(rowData, [
            { path: ['lines', 'itemCode'] },
            { path: ['itemCode'], default: '' },
          ]),
      },
    ],
    [
      'itemName',
      {
        Cell: TooltipTextCell,
        getSortValue: row =>
          getColumnPropertyAsString(row, [
            { path: ['lines', 'itemName'] },
            { path: ['itemName'], default: '' },
          ]),
        accessor: ({ rowData }) =>
          getColumnProperty(rowData, [
            { path: ['lines', 'itemName'] },
            { path: ['itemName'], default: '' },
          ]),
      },
    ],
    [
      'batch',
      {
        getSortValue: row =>
          getColumnPropertyAsString(row, [
            { path: ['lines', 'batch'] },
            { path: ['batch'] },
          ]),
        accessor: ({ rowData }) =>
          getColumnProperty(rowData, [
            { path: ['lines', 'batch'] },
            { path: ['batch'] },
          ]),
      },
    ],
    [
      'expiryDate',
      {
        getSortValue: row =>
          getColumnPropertyAsString(row, [
            { path: ['lines', 'expiryDate'] },
            { path: ['expiryDate'] },
          ]),
        accessor: ({ rowData }) =>
          getColumnProperty(rowData, [
            { path: ['lines', 'expiryDate'] },
            { path: ['expiryDate'] },
          ]),
      },
    ],
    [
      'itemUnit',
      {
        getSortValue: row =>
          getColumnPropertyAsString(row, [
            { path: ['lines', 'item', 'unitName'] },
            { path: ['item', 'unitName'], default: '' },
          ]),
        accessor: ({ rowData }) =>
          getColumnProperty(rowData, [
            { path: ['lines', 'item', 'unitName'] },
            { path: ['item', 'unitName'], default: '' },
          ]),
      },
    ],
    [
      'packSize',
      {
        getSortValue: row => {
          if ('lines' in row) {
            const { lines } = row;
            return ArrayUtils.ifTheSameElseDefault(lines, 'packSize', '');
          } else {
            return row.packSize ?? '';
          }
        },
        accessor: ({ rowData }) => {
          if ('lines' in rowData) {
            const { lines } = rowData;
            return ArrayUtils.ifTheSameElseDefault(lines, 'packSize', '');
          } else {
            return rowData.packSize;
          }
        },
      },
    ],
    [
      'numberOfPacks',
      {
        Cell: NumberCell,
        accessor: ({ rowData }) => {
          if ('lines' in rowData) {
            const { lines } = rowData;
            return ArrayUtils.getSum(lines, 'numberOfPacks');
          } else {
            return rowData.numberOfPacks;
          }
        },
        getSortValue: rowData => {
          if ('lines' in rowData) {
            const { lines } = rowData;
            return ArrayUtils.getSum(lines, 'numberOfPacks');
          } else {
            return rowData.numberOfPacks;
          }
        },
      },
    ],
    [
      'unitQuantity',
      {
        accessor: ({ rowData }) => {
          if ('lines' in rowData) {
            const { lines } = rowData;
            return ArrayUtils.getUnitQuantity(lines);
          } else {
            return getUnitQuantity(rowData);
          }
        },
        getSortValue: rowData => {
          if ('lines' in rowData) {
            const { lines } = rowData;
            return ArrayUtils.getUnitQuantity(lines);
          } else {
            return getUnitQuantity(rowData);
          }
        },
      },
    ],
    expansionColumn,
    GenericColumnKey.Selection,
  ];

  return useColumns(columns, { onChangeSortBy, sortBy }, [sortBy]);
};

export const useExpansionColumns = (): Column<CustomerReturnLineFragment>[] =>
  useColumns(['batch', 'expiryDate', 'numberOfPacks', 'packSize']);
