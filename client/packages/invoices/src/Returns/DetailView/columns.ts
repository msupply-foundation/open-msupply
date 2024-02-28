import {
  useColumns,
  //   getRowExpandColumn,
  //   getNotePopoverColumn,
  ColumnAlign,
  GenericColumnKey,
  SortBy,
  Column,
  useCurrency,
  InvoiceLineNodeType,
  TooltipTextCell,
  useColumnUtils,
  NumberCell,
} from '@openmsupply-client/common';

interface UseOutboundColumnOptions {
  sortBy: SortBy<OutboundReturnLine>;
  onChangeSortBy: (column: Column<OutboundReturnLine>) => void;
}

// TO-DO: Replace with generated once query is live
export interface OutboundReturnLine {
  id: string;
  itemCode: string;
  itemName: string;
  batch: string | null;
  expiryDate: string | null;
  numberOfPacks: number;
  packSize: number;
  sellPricePerPack: number;
  type: InvoiceLineNodeType;
}

// const expansionColumn = getRowExpandColumn<
//   StockOutLineFragment | StockOutItem
// >();
// const notePopoverColumn = getNotePopoverColumn<
//   StockOutLineFragment | StockOutItem
// >();

const isDefaultPlaceholderRow = (row: OutboundReturnLine) =>
  row.type === InvoiceLineNodeType.UnallocatedStock && !row.numberOfPacks;

const getPackSize = (row: OutboundReturnLine) =>
  isDefaultPlaceholderRow(row) ? '' : row.packSize;

const getNumberOfPacks = (row: OutboundReturnLine) =>
  isDefaultPlaceholderRow(row) ? '' : row.numberOfPacks;

const getUnitQuantity = (row: OutboundReturnLine) =>
  isDefaultPlaceholderRow(row) ? '' : row.packSize * row.numberOfPacks;

export const useOutboundReturnColumns = ({
  sortBy,
  onChangeSortBy,
}: UseOutboundColumnOptions): Column<OutboundReturnLine>[] => {
  const { c } = useCurrency();
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
          getSortValue: (row: OutboundReturnLine) =>
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
          getSortValue: (row: OutboundReturnLine) =>
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
            return getNumberOfPacks(row);
          },
          accessor: ({ rowData }) => {
            return getNumberOfPacks(rowData);
          },
        },
      ],
      [
        'packSize',
        {
          getSortValue: row => {
            return getPackSize(row) ?? '';
          },
          accessor: ({ rowData }) => {
            return getPackSize(rowData);
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
      {
        label: 'label.unit-price',
        key: 'sellPricePerUnit',
        align: ColumnAlign.Right,
        accessor: ({ rowData }) => {
          if (isDefaultPlaceholderRow(rowData)) return '';
          return c((rowData.sellPricePerPack ?? 0) / rowData.packSize).format();
        },
        getSortValue: rowData => {
          return c((rowData.sellPricePerPack ?? 0) / rowData.packSize).format();
        },
      },
      {
        label: 'label.line-total',
        key: 'lineTotal',
        align: ColumnAlign.Right,
        accessor: ({ rowData }) => {
          if (isDefaultPlaceholderRow(rowData)) return '';
          const x = c(
            rowData.sellPricePerPack * rowData.numberOfPacks
          ).format();
          return x;
        },
        getSortValue: row => {
          const x = c(row.sellPricePerPack * row.numberOfPacks).format();
          return x;
        },
      },
      //   expansionColumn,
      GenericColumnKey.Selection,
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );
};
