import {
  useColumns,
  //   getRowExpandColumn,
  //   getNotePopoverColumn,
  // ColumnAlign,
  GenericColumnKey,
  SortBy,
  Column,
  // useCurrency,
  TooltipTextCell,
  useColumnUtils,
  NumberCell,
} from '@openmsupply-client/common';
import { InboundReturnDetailRowFragment } from '../api';

interface UseInboundReturnColumnOptions {
  sortBy: SortBy<InboundReturnDetailRowFragment>;
  onChangeSortBy: (column: Column<InboundReturnDetailRowFragment>) => void;
}

// const expansionColumn = getRowExpandColumn<
//   StockOutLineFragment | StockOutItem
// >();
// const notePopoverColumn = getNotePopoverColumn<
//   StockOutLineFragment | StockOutItem
// >();

const getUnitQuantity = (row: InboundReturnDetailRowFragment) =>
  row.packSize * row.numberOfPacks;

export const useInboundReturnColumns = ({
  sortBy,
  onChangeSortBy,
}: UseInboundReturnColumnOptions): Column<InboundReturnDetailRowFragment>[] => {
  // const { c } = useCurrency();
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
          getSortValue: (row: InboundReturnDetailRowFragment) =>
            getColumnPropertyAsString(row, [
              { path: ['itemCode'], default: '' },
            ]),
          accessor: ({ rowData }) =>
            getColumnProperty(rowData, [{ path: ['itemCode'], default: '' }]),
        },
      ],
      [
        'itemName',
        {
          Cell: TooltipTextCell,
          getSortValue: (row: InboundReturnDetailRowFragment) =>
            getColumnPropertyAsString(row, [{ path: ['itemName'] }]),
          accessor: ({ rowData }) =>
            getColumnProperty(rowData, [{ path: ['itemName'] }]),
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
            getColumnPropertyAsString(row, [{ path: ['batch'] }]),
          accessor: ({ rowData }) =>
            getColumnProperty(rowData, [{ path: ['batch'] }]),
        },
      ],
      [
        'expiryDate',
        {
          getSortValue: row =>
            getColumnPropertyAsString(row, [{ path: ['expiryDate'] }]),
          accessor: ({ rowData }) =>
            getColumnProperty(rowData, [{ path: ['expiryDate'] }]),
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
      [
        'numberOfPacks',
        {
          Cell: NumberCell,
          getSortValue: row => {
            return row.numberOfPacks;
          },
          accessor: ({ rowData }) => {
            return rowData.numberOfPacks;
          },
        },
      ],
      [
        'packSize',
        {
          getSortValue: row => {
            return row.packSize;
          },
          accessor: ({ rowData }) => {
            return rowData.packSize;
          },
        },
      ],
      [
        'unitQuantity',
        {
          Cell: NumberCell,
          accessor: ({ rowData }) => {
            return getUnitQuantity(rowData);
          },
        },
      ],
      // {
      //   label: 'label.unit-price',
      //   key: 'sellPricePerUnit',
      //   align: ColumnAlign.Right,
      //   accessor: ({ rowData }) => {
      //     return c((rowData.sellPricePerPack ?? 0) / rowData.packSize).format();
      //   },
      //   getSortValue: rowData => {
      //     return c((rowData.sellPricePerPack ?? 0) / rowData.packSize).format();
      //   },
      // },
      // {
      //   label: 'label.line-total',
      //   key: 'lineTotal',
      //   align: ColumnAlign.Right,
      //   accessor: ({ rowData }) => {
      //     const x = c(
      //       rowData.sellPricePerPack * rowData.numberOfPacks
      //     ).format();
      //     return x;
      //   },
      //   getSortValue: row => {
      //     const x = c(row.sellPricePerPack * row.numberOfPacks).format();
      //     return x;
      //   },
      // },
      //   expansionColumn,
      GenericColumnKey.Selection,
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );
};
