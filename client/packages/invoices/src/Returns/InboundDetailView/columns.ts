import {
  useColumns,
  //   getNotePopoverColumn,
  GenericColumnKey,
  SortBy,
  Column,
  TooltipTextCell,
  useColumnUtils,
  NumberCell,
  getRowExpandColumn,
  ArrayUtils,
} from '@openmsupply-client/common';
import { InboundReturnLineFragment } from '../api';
import { InboundReturnItem } from '../../types';
import { getPackVariantCell } from '@openmsupply-client/system';

interface UseInboundReturnColumnOptions {
  sortBy: SortBy<InboundReturnLineFragment | InboundReturnItem>;
  onChangeSortBy: (sort: string, dir: 'desc' | 'asc') => void;
}

const expansionColumn = getRowExpandColumn<
  InboundReturnLineFragment | InboundReturnItem
>();

// const notePopoverColumn = getNotePopoverColumn<
//   StockOutLineFragment | StockOutItem
// >();

const getUnitQuantity = (row: InboundReturnLineFragment) =>
  row.packSize * row.numberOfPacks;

export const useInboundReturnColumns = ({
  sortBy,
  onChangeSortBy,
}: UseInboundReturnColumnOptions): Column<
  InboundReturnLineFragment | InboundReturnItem
>[] => {
  const { getColumnProperty, getColumnPropertyAsString } = useColumnUtils();

  return useColumns(
    [
      //   [
      //     notePopoverColumn,
      //     {
      //       accessor: ({ rowData }) => {
      //         if ('lines' in rowData) {
      //           const { lines } = rowData;
      //           const noteSections = lines
      //             .map(({ batch, note }) => ({
      //               header: batch ?? '',
      //               body: note ?? '',
      //             }))
      //             .filter(({ body }) => !!body);
      //           return noteSections.length ? noteSections : null;
      //         } else {
      //           return rowData.batch && rowData.note
      //             ? { header: rowData.batch, body: rowData.note }
      //             : null;
      //         }
      //       },
      //     },
      //   ],
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
      //   [
      //     'itemUnit',
      //     {
      //       getSortValue: row =>
      //         getColumnPropertyAsString(row, [
      //           { path: ['lines', 'item', 'unitName'] },
      //           { path: ['item', 'unitName'], default: '' },
      //         ]),
      //       accessor: ({ rowData }) =>
      //         getColumnProperty(rowData, [
      //           { path: ['lines', 'item', 'unitName'] },
      //           { path: ['item', 'unitName'], default: '' },
      //         ]),
      //     },
      //   ],
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
      //   [
      //     'location',
      //     {
      //       getSortValue: row =>
      //         getColumnPropertyAsString(row, [
      //           { path: ['lines', 'location', 'code'] },
      //           { path: ['location', 'code'], default: '' },
      //         ]),
      //       accessor: ({ rowData }) =>
      //         getColumnProperty(rowData, [
      //           { path: ['lines', 'location', 'code'] },
      //           { path: ['location', 'code'], default: '' },
      //         ]),
      //     },
      //   ],
      {
        key: 'packUnit',
        label: 'label.pack',
        sortable: false,
        Cell: getPackVariantCell({
          getItemId: row => {
            if ('lines' in row) return '';
            else return row?.item?.id;
          },
          getPackSizes: row => {
            if ('lines' in row) return row.lines.map(l => l.packSize ?? 1);
            else return [row?.packSize ?? 1];
          },
          getUnitName: row => {
            if ('lines' in row) return row.lines[0]?.item?.unitName ?? null;
            else return row?.item?.unitName ?? null;
          },
        }),
        width: 130,
      },
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
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );
};

export const useExpansionColumns = (): Column<InboundReturnLineFragment>[] =>
  useColumns(['batch', 'expiryDate', 'numberOfPacks', 'packSize']);
