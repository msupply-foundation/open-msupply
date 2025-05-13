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
  TypedTFunction,
  LocaleKey,
  useTranslation,
} from '@openmsupply-client/common';
import { StockOutLineFragment } from '../../StockOut';
import { StockOutItem } from '../../types';

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
        getSortValue: row => String(getPackSizeValue(row, getColumnProperty)),

        accessor: ({ rowData }) => getPackSizeValue(rowData, getColumnProperty),
      },
    ],
    ...(displayDoseColumns ? [getDosesPerUnitColumn(t)] : []),
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
      },
    ],
    ...(displayDoseColumns ? [getDoseQuantityColumn()] : []),
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
    },
    expansionColumn,
  ];

  return useColumns(columns, { onChangeSortBy, sortBy }, [sortBy]);
};

// TODO: use common column when merged - and align riiiiight
const getDosesPerUnitColumn = (
  t: TypedTFunction<LocaleKey>
): ColumnDescription<StockOutLineFragment | StockOutItem> => ({
  key: 'dosesPerUnit', // todo?
  label: 'label.doses-per-unit',
  accessor: ({ rowData }) => {
    // This will get more complex once doses per unit is configured by item variant!
    // return rowData?.doses,
    if ('lines' in rowData) {
      const { lines } = rowData;
      if (Array.isArray(lines) && lines[0]?.item?.isVaccine) {
        const doses = lines.map(
          ({ item }) => item?.doses ?? UNDEFINED_STRING_VALUE
        );
        const dosesTheSame = doses.every(dose => dose === doses[0]);
        return dosesTheSame ? doses[0] : t('multiple');
      } else {
        return UNDEFINED_STRING_VALUE;
      }
    } else {
      return rowData?.item?.isVaccine
        ? (rowData?.item?.doses ?? UNDEFINED_STRING_VALUE)
        : UNDEFINED_STRING_VALUE;
    }
  },
});

// TODO: share with common when exists
const getDoseQuantityColumn = (): ColumnDescription<
  StockOutLineFragment | StockOutItem
> => ({
  key: 'doseQuantity',
  label: 'label.doses',
  width: 100,
  align: ColumnAlign.Right,
  accessor: ({ rowData }) => {
    // This will get more complex once doses per unit is configured by item variant!
    if ('lines' in rowData) {
      const { lines } = rowData;
      const isVaccine = lines[0]?.item?.isVaccine ?? false;
      const unitQuantity = ArrayUtils.getUnitQuantity(lines);

      return isVaccine
        ? unitQuantity * (lines[0]?.item.doses ?? 1)
        : UNDEFINED_STRING_VALUE;
    } else {
      return rowData.item.isVaccine
        ? rowData.packSize * rowData.numberOfPacks * rowData.item.doses
        : UNDEFINED_STRING_VALUE;
    }
  },
});

const getPackSizeValue = (
  row: StockOutLineFragment | StockOutItem,
  getColumnProperty: ReturnType<typeof useColumnUtils>['getColumnProperty']
) => {
  const lineType = getColumnProperty(row, [
    { path: ['lines', 'type'] },
    { path: ['type'], default: '' },
  ]);

  if (lineType === InvoiceLineNodeType.UnallocatedStock) {
    return UNDEFINED_STRING_VALUE;
  } else {
    return getColumnProperty(row, [
      { path: ['lines', 'packSize'] },
      { path: ['packSize'], default: '' },
    ]);
  }
};
