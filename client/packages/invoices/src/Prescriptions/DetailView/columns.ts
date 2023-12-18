import {
  useColumns,
  getRowExpandColumn,
  getNotePopoverColumn,
  ColumnAlign,
  GenericColumnKey,
  SortBy,
  Column,
  ArrayUtils,
  useCurrency,
  PositiveNumberCell,
  useTranslation,
  useColumnUtils,
} from '@openmsupply-client/common';
import { StockOutLineFragment } from '../../StockOut';
import { StockOutItem } from '../../types';

interface UsePrescriptionColumnOptions {
  sortBy: SortBy<StockOutLineFragment | StockOutItem>;
  onChangeSortBy: (column: Column<StockOutLineFragment | StockOutItem>) => void;
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
  const { c } = useCurrency();
  const t = useTranslation('dispensary');
  const { getColumnEntityProperty, getColumnProperty } = useColumnUtils();

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
            getColumnEntityProperty({
              row,
              entity: 'item',
              key: 'code',
              defaults: { multiple: '' },
            }),
          accessor: ({ rowData }) =>
            getColumnEntityProperty({
              row: rowData,
              entity: 'item',
              key: 'code',
              defaults: { multiple: '' },
            }),
        },
      ],
      [
        'itemName',
        {
          getSortValue: row =>
            getColumnEntityProperty({
              row,
              entity: 'item',
              key: 'name',
              defaults: { multiple: '' },
            }),

          accessor: ({ rowData }) =>
            getColumnEntityProperty({
              row: rowData,
              entity: 'item',
              key: 'name',
              defaults: { multiple: '' },
            }),
        },
      ],
      [
        'itemUnit',
        {
          getSortValue: row =>
            getColumnEntityProperty({
              row,
              entity: 'item',
              key: 'unitName',
              defaults: { single: '', multiple: '' },
            }),
          accessor: ({ rowData }) =>
            getColumnEntityProperty({
              row: rowData,
              entity: 'item',
              key: 'unitName',
              defaults: { single: '', multiple: '' },
            }),
        },
      ],
      [
        'batch',
        {
          getSortValue: row =>
            String(
              getColumnProperty({
                row,
                key: 'batch',
                defaults: { single: '' },
              })
            ),
          accessor: ({ rowData }) =>
            getColumnProperty({ row: rowData, key: 'batch' }),
        },
      ],
      [
        'expiryDate',
        {
          getSortValue: row =>
            String(
              getColumnProperty({
                row,
                key: 'expiryDate',
                defaults: { single: '' },
              })
            ),
          accessor: ({ rowData }) =>
            getColumnProperty({ row: rowData, key: 'expiryDate' }),
        },
      ],
      [
        'location',
        {
          getSortValue: row =>
            getColumnEntityProperty({ row, entity: 'location', key: 'code' }),
          accessor: ({ rowData }) =>
            getColumnEntityProperty({
              row: rowData,
              entity: 'location',
              key: 'code',
            }),
        },
      ],
      [
        'numberOfPacks',
        {
          Cell: PositiveNumberCell,
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
            String(
              getColumnProperty({
                row,
                key: 'packSize',
                defaults: { single: '', multiple: '' },
              })
            ),
          accessor: ({ rowData }) =>
            getColumnProperty({
              row: rowData,
              key: 'packSize',
              defaults: { multiple: '' },
            }),
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
        accessor: ({ rowData }) => {
          if ('lines' in rowData) {
            return c(
              Object.values(rowData.lines).reduce(
                (sum, batch) =>
                  sum + (batch.sellPricePerPack ?? 0) / batch.packSize,
                0
              )
            ).format();
          } else {
            return c(
              (rowData.sellPricePerPack ?? 0) / rowData.packSize
            ).format();
          }
        },
        getSortValue: rowData => {
          if ('lines' in rowData) {
            return c(
              Object.values(rowData.lines).reduce(
                (sum, batch) =>
                  sum + (batch.sellPricePerPack ?? 0) / batch.packSize,
                0
              )
            ).format();
          } else {
            return c(
              (rowData.sellPricePerPack ?? 0) / rowData.packSize
            ).format();
          }
        },
      },
      {
        label: 'label.line-total',
        key: 'lineTotal',
        align: ColumnAlign.Right,
        accessor: ({ rowData }) => {
          if ('lines' in rowData) {
            return c(
              Object.values(rowData.lines).reduce(
                (sum, batch) =>
                  sum + batch.sellPricePerPack * batch.numberOfPacks,
                0
              )
            ).format();
          } else {
            const x = c(
              rowData.sellPricePerPack * rowData.numberOfPacks
            ).format();
            return x;
          }
        },
        getSortValue: row => {
          if ('lines' in row) {
            return c(
              Object.values(row.lines).reduce(
                (sum, batch) =>
                  sum + batch.sellPricePerPack * batch.numberOfPacks,
                0
              )
            ).format();
          } else {
            const x = c(row.sellPricePerPack * row.numberOfPacks).format();
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
