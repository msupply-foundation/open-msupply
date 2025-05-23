import {
  useColumns,
  getRowExpandColumn,
  getNotePopoverColumn,
  ColumnAlign,
  GenericColumnKey,
  SortBy,
  Column,
  ArrayUtils,
  InvoiceLineNodeType,
  TooltipTextCell,
  useColumnUtils,
  NumberCell,
  CurrencyCell,
  ColumnDescription,
  UNDEFINED_STRING_VALUE,
  useTranslation,
  getDosesPerUnitColumn,
} from '@openmsupply-client/common';
import { StockOutLineFragment } from '../../StockOut';
import { StockOutItem } from '../../types';
import { getDosesQuantityColumn } from '../../DoseQtyColumn';

interface UseOutboundColumnOptions {
  sortBy: SortBy<StockOutLineFragment | StockOutItem>;
  onChangeSortBy: (sort: string, dir: 'desc' | 'asc') => void;
  displayDoseColumns: boolean;
}

const expansionColumn = getRowExpandColumn<
  StockOutLineFragment | StockOutItem
>();
const notePopoverColumn = getNotePopoverColumn<
  StockOutLineFragment | StockOutItem
>();

const isDefaultPlaceholderRow = (row: StockOutLineFragment) =>
  row.type === InvoiceLineNodeType.UnallocatedStock && !row.numberOfPacks;

const getNumberOfPacks = (row: StockOutLineFragment) =>
  isDefaultPlaceholderRow(row) ? '' : row.numberOfPacks;

const getUnitQuantity = (row: StockOutLineFragment) =>
  isDefaultPlaceholderRow(row) ? '' : row.packSize * row.numberOfPacks;

export const useOutboundColumns = ({
  sortBy,
  onChangeSortBy,
  displayDoseColumns,
}: UseOutboundColumnOptions): Column<StockOutLineFragment | StockOutItem>[] => {
  const t = useTranslation();
  const { getColumnProperty, getColumnPropertyAsString } = useColumnUtils();

  const columns: ColumnDescription<StockOutLineFragment | StockOutItem>[] = [
    GenericColumnKey.Selection,
    [
      notePopoverColumn,
      {
        accessor: ({ rowData }) => {
          if ('lines' in rowData) {
            const { lines } = rowData;
            const noteSections = lines
              .map(({ batch, note }) => ({
                header: batch ?? '',
                body: note ?? '',
              }))
              .filter(({ body }) => !!body);
            return noteSections.length ? noteSections : null;
          } else {
            return rowData.batch && rowData.note
              ? { header: rowData.batch, body: rowData.note }
              : null;
          }
        },
      },
    ],
    [
      'itemCode',
      {
        getSortValue: row =>
          getColumnPropertyAsString(row, [
            { path: ['lines', 'item', 'code'], default: '' },
            { path: ['item', 'code'], default: '' },
          ]),
        accessor: ({ rowData }) =>
          getColumnProperty(rowData, [
            { path: ['lines', 'item', 'code'], default: '' },
            { path: ['item', 'code'], default: '' },
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
            { path: ['batch'], default: '' },
          ]),
        accessor: ({ rowData }) =>
          getColumnProperty(rowData, [
            { path: ['lines', 'batch'] },
            { path: ['batch'] },
          ]),
          defaultHideOnMobile: true,
      },
    ],
    [
      'expiryDate',
      {
        getSortValue: row =>
          getColumnPropertyAsString(row, [
            { path: ['lines', 'expiryDate'] },
            { path: ['expiryDate'], default: '' },
          ]),
        accessor: ({ rowData }) =>
          getColumnProperty(rowData, [
            { path: ['lines', 'expiryDate'] },
            { path: ['expiryDate'] },
          ]),
          defaultHideOnMobile: true,
      },
    ],
    [
      'location',
      {
        getSortValue: row =>
          getColumnPropertyAsString(row, [
            { path: ['lines', 'location', 'code'] },
            { path: ['location', 'code'], default: '' },
          ]),
        accessor: ({ rowData }) =>
          getColumnProperty(rowData, [
            { path: ['lines', 'location', 'code'] },
            { path: ['location', 'code'], default: '' },
          ]),
        width: 100,
        defaultHideOnMobile: true,
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
          defaultHideOnMobile: true,
      },
    ],
    [
      'packSize',
      {
        getSortValue: row => String(getPackSizeValue(row, getColumnProperty)),

        accessor: ({ rowData }) => getPackSizeValue(rowData, getColumnProperty),
        defaultHideOnMobile: true,
      },
    ],
  ];

  if (displayDoseColumns) {
    columns.push(getDosesPerUnitColumn(t));
  }

  columns.push(
    [
      'numberOfPacks',
      {
        Cell: NumberCell,
        getSortValue: row => {
          if ('lines' in row) {
            const { lines } = row;
            return lines.reduce((acc, value) => acc + value.numberOfPacks, 0);
          } else {
            return getNumberOfPacks(row);
          }
        },
        accessor: ({ rowData }) => {
          if ('lines' in rowData) {
            const { lines } = rowData;
            return lines.reduce((acc, value) => acc + value.numberOfPacks, 0);
          } else {
            return getNumberOfPacks(rowData);
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
        defaultHideOnMobile: true,
      },
    ]
  );

  if (displayDoseColumns) {
    columns.push(getDosesQuantityColumn());
  }

  columns.push(
    {
      label: 'label.unit-sell-price',
      key: 'sellPricePerUnit',
      align: ColumnAlign.Right,
      Cell: CurrencyCell,
      accessor: ({ rowData }) => {
        if ('lines' in rowData) {
          const { lines } = rowData;
          return ArrayUtils.getAveragePrice(lines, 'sellPricePerPack');
        } else {
          if (isDefaultPlaceholderRow(rowData)) return undefined;
          return (rowData.sellPricePerPack ?? 0) / rowData.packSize;
        }
      },
      getSortValue: rowData => {
        if ('lines' in rowData) {
          return Object.values(rowData.lines).reduce(
            (sum, batch) =>
              sum + (batch.sellPricePerPack ?? 0) / batch.packSize,
            0
          );
        } else {
          return (rowData.sellPricePerPack ?? 0) / rowData.packSize;
        }
      },
      defaultHideOnMobile: true,
    },
    {
      label: 'label.total',
      key: 'total',
      align: ColumnAlign.Right,
      Cell: CurrencyCell,
      accessor: ({ rowData }) => {
        if ('lines' in rowData) {
          return Object.values(rowData.lines).reduce(
            (sum, batch) => sum + batch.sellPricePerPack * batch.numberOfPacks,
            0
          );
        } else {
          if (isDefaultPlaceholderRow(rowData)) return '';

          const x = rowData.sellPricePerPack * rowData.numberOfPacks;
          return x;
        }
      },
      getSortValue: row => {
        if ('lines' in row) {
          return Object.values(row.lines).reduce(
            (sum, batch) => sum + batch.sellPricePerPack * batch.numberOfPacks,
            0
          );
        } else {
          const x = row.sellPricePerPack * row.numberOfPacks;
          return x;
        }
      },
      defaultHideOnMobile: true,
    },
    expansionColumn
  );

  return useColumns(columns, { onChangeSortBy, sortBy }, [sortBy]);
};

const getPackSizeValue = (
  row: StockOutLineFragment | StockOutItem,
  getColumnProperty: ReturnType<typeof useColumnUtils>['getColumnProperty']
) => {
  const lineType = getColumnProperty(row, [
    { path: ['lines', 'type'] },
    { path: ['type'], default: '' },
  ]);

  if (lineType === InvoiceLineNodeType.UnallocatedStock) {
    const unitQuantity =
      'lines' in row ? ArrayUtils.getUnitQuantity(row.lines) : row.packSize;

    if (unitQuantity === 0) return UNDEFINED_STRING_VALUE;
  }
  return getColumnProperty(row, [
    { path: ['lines', 'packSize'] },
    { path: ['packSize'], default: '' },
  ]);
};
