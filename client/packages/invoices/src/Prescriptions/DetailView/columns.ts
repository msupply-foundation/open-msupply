import {
  useColumns,
  getRowExpandColumn,
  getNotePopoverColumn,
  ColumnAlign,
  GenericColumnKey,
  SortBy,
  Column,
  ArrayUtils,
  useTranslation,
  useColumnUtils,
  NumberCell,
  CurrencyCell,
} from '@openmsupply-client/common';
import { StockOutLineFragment } from '../../StockOut';
import { StockOutItem } from '../../types';

interface UsePrescriptionColumnOptions {
  sortBy: SortBy<StockOutLineFragment | StockOutItem>;
  onChangeSortBy: (sort: string, dir: 'desc' | 'asc') => void;
}

const expansionColumn = getRowExpandColumn<
  StockOutLineFragment | StockOutItem
>();

export const usePrescriptionColumn = ({
  sortBy,
  onChangeSortBy,
}: UsePrescriptionColumnOptions): Column<
  StockOutLineFragment | StockOutItem
>[] => {
  const t = useTranslation('dispensary');
  const { getColumnPropertyAsString, getColumnProperty } = useColumnUtils();

  return useColumns(
    [
      [
        getNotePopoverColumn(t('label.directions')),
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
            getColumnPropertyAsString<StockOutLineFragment | StockOutItem>(
              row,
              [
                { path: ['lines', 'item', 'code'] },
                { path: ['item', 'code'], default: '' },
              ]
            ),
          accessor: ({ rowData }) =>
            getColumnProperty(rowData, [
              { path: ['lines', 'item', 'code'] },
              { path: ['item', 'code'], default: '' },
            ]),
        },
      ],
      [
        'itemName',
        {
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
              { path: ['location', 'code'] },
            ]),
        },
      ],
      [
        'numberOfPacks',
        {
          Cell: NumberCell,
          getSortValue: row => {
            if ('lines' in row) {
              const { lines } = row;
              const packSize = ArrayUtils.ifTheSameElseDefault(
                lines,
                'packSize',
                ''
              );
              if (packSize) {
                return lines.reduce(
                  (acc, value) => acc + value.numberOfPacks,
                  0
                );
              } else {
                return '';
              }
            } else {
              return row.numberOfPacks;
            }
          },
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              const packSize = ArrayUtils.ifTheSameElseDefault(
                lines,
                'packSize',
                ''
              );
              if (packSize) {
                return lines.reduce(
                  (acc, value) => acc + value.numberOfPacks,
                  0
                );
              } else {
                return '';
              }
            } else {
              return rowData.numberOfPacks;
            }
          },
        },
      ],
      [
        'packSize',
        {
          getSortValue: row =>
            getColumnPropertyAsString(row, [
              { path: ['lines', 'packSize'] },
              { path: ['packSize'], default: '' },
            ]),
          accessor: ({ rowData }) =>
            getColumnProperty(rowData, [
              { path: ['lines', 'packSize'] },
              { path: ['packSize'] },
            ]),
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
              return rowData.packSize * rowData.numberOfPacks;
            }
          },
          getSortValue: rowData => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return ArrayUtils.getUnitQuantity(lines);
            } else {
              return rowData.packSize * rowData.numberOfPacks;
            }
          },
        },
      ],
      {
        label: 'label.unit-price',
        key: 'sellPricePerUnit',
        align: ColumnAlign.Right,
        Cell: CurrencyCell,
        accessor: ({ rowData }) => {
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
        label: 'label.line-total',
        key: 'lineTotal',
        align: ColumnAlign.Right,
        Cell: CurrencyCell,
        accessor: ({ rowData }) => {
          if ('lines' in rowData) {
            return Object.values(rowData.lines).reduce(
              (sum, batch) =>
                sum + batch.sellPricePerPack * batch.numberOfPacks,
              0
            );
          } else {
            const x = rowData.sellPricePerPack * rowData.numberOfPacks;
            return x;
          }
        },
        getSortValue: row => {
          if ('lines' in row) {
            return Object.values(row.lines).reduce(
              (sum, batch) =>
                sum + batch.sellPricePerPack * batch.numberOfPacks,
              0
            );
          } else {
            const x = row.sellPricePerPack * row.numberOfPacks;
            return x;
          }
        },
      },
      expansionColumn,
      GenericColumnKey.Selection,
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );
};
