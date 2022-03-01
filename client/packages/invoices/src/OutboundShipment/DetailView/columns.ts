import {
  formatExpiryDateString,
  useColumns,
  getRowExpandColumn,
  getNotePopoverColumn,
  ColumnAlign,
  ColumnFormat,
  GenericColumnKey,
  SortBy,
  Column,
  ifTheSameElseDefault,
} from '@openmsupply-client/common';
import { InvoiceItem } from '../../types';
import { OutboundShipmentLineFragment } from '../api/operations.generated';

interface UseOutboundColumnOptions {
  sortBy: SortBy<OutboundShipmentLineFragment | InvoiceItem>;
  onChangeSortBy: (
    column: Column<OutboundShipmentLineFragment | InvoiceItem>
  ) => SortBy<OutboundShipmentLineFragment | InvoiceItem>;
}

const expansionColumn = getRowExpandColumn<
  OutboundShipmentLineFragment | InvoiceItem
>();
const notePopoverColumn = getNotePopoverColumn<
  OutboundShipmentLineFragment | InvoiceItem
>();

export const useOutboundColumns = ({
  sortBy,
  onChangeSortBy,
}: UseOutboundColumnOptions): Column<
  OutboundShipmentLineFragment | InvoiceItem
>[] =>
  useColumns(
    [
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
          getSortValue: row => {
            if ('lines' in row) {
              const { lines } = row;
              return ifTheSameElseDefault(lines, 'itemCode', '');
            } else {
              return row.itemCode;
            }
          },
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return ifTheSameElseDefault(lines, 'itemCode', '');
            } else {
              return rowData.itemCode;
            }
          },
        },
      ],
      [
        'itemName',
        {
          getSortValue: row => {
            if ('lines' in row) {
              const { lines } = row;
              return ifTheSameElseDefault(lines, 'itemName', '');
            } else {
              return row.itemName;
            }
          },
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return ifTheSameElseDefault(lines, 'itemName', '');
            } else {
              return rowData.itemName;
            }
          },
        },
      ],
      [
        'batch',
        {
          getSortValue: row => {
            if ('lines' in row) {
              const { lines } = row;
              return ifTheSameElseDefault(lines, 'batch', '[multiple]') ?? '';
            } else {
              return row.batch ?? '';
            }
          },
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return ifTheSameElseDefault(lines, 'batch', '[multiple]');
            } else {
              return rowData.batch;
            }
          },
        },
      ],
      [
        'expiryDate',
        {
          getSortValue: row => {
            if ('lines' in row) {
              const { lines } = row;
              const expiryDate =
                ifTheSameElseDefault(lines, 'expiryDate', null) ?? '';
              return formatExpiryDateString(expiryDate);
            } else {
              return formatExpiryDateString(row.expiryDate);
            }
          },
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              const expiryDate = ifTheSameElseDefault(
                lines,
                'expiryDate',
                null
              );
              return formatExpiryDateString(expiryDate);
            } else {
              return formatExpiryDateString(rowData.expiryDate);
            }
          },
        },
      ],
      [
        'locationName',
        {
          width: 180,
          getSortValue: row => {
            if ('lines' in row) {
              return '';
            } else {
              return row.numberOfPacks ?? '';
            }
          },
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              return '';
            } else {
              return rowData.numberOfPacks;
            }
          },
        },
      ],
      [
        'itemUnit',
        {
          width: 180,
          getSortValue: row => {
            if ('lines' in row) {
              return '';
            } else {
              return row.numberOfPacks ?? '';
            }
          },
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              return '';
            } else {
              return rowData.numberOfPacks;
            }
          },
        },
      ],
      [
        'numberOfPacks',
        {
          width: 180,
          getSortValue: row => {
            if ('lines' in row) {
              const { lines } = row;
              return ifTheSameElseDefault(lines, 'numberOfPacks', '') ?? '';
            } else {
              return row.numberOfPacks ?? '';
            }
          },
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return ifTheSameElseDefault(lines, 'numberOfPacks', '');
            } else {
              return rowData.numberOfPacks;
            }
          },
        },
      ],
      [
        'packSize',
        {
          width: 50,
          getSortValue: row => {
            if ('lines' in row) {
              const { lines } = row;
              return ifTheSameElseDefault(lines, 'packSize', '') ?? '';
            } else {
              return row.packSize ?? '';
            }
          },
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return ifTheSameElseDefault(lines, 'packSize', '');
            } else {
              return rowData.packSize;
            }
          },
        },
      ],
      'unitQuantity',
      {
        label: 'label.unit-price',
        key: 'sellPricePerUnit',
        width: 100,
        align: ColumnAlign.Right,
        format: ColumnFormat.Currency,
        accessor: ({ rowData }) => {
          if ('lines' in rowData) {
            Object.values(rowData.lines).reduce(
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
        width: 100,
        align: ColumnAlign.Right,
        format: ColumnFormat.Currency,
        accessor: ({ rowData }) => {
          if ('lines' in rowData) {
            return Object.values(rowData.lines).reduce(
              (sum, batch) =>
                sum + batch.sellPricePerPack * batch.numberOfPacks,
              0
            );
          } else {
            return rowData.sellPricePerPack * rowData.numberOfPacks;
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
            return row.sellPricePerPack * row.numberOfPacks;
          }
        },
      },
      expansionColumn,
      GenericColumnKey.Selection,
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );
