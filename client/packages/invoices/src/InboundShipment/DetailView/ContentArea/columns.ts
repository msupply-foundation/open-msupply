import {
  getRowExpandColumn,
  GenericColumnKey,
  getNotePopoverColumn,
  useColumns,
  Column,
  ArrayUtils,
  useUrlQueryParams,
  ColumnAlign,
  TooltipTextCell,
  useColumnUtils,
  CurrencyCell,
} from '@openmsupply-client/common';
import { InboundItem } from '../../../types';
import { InboundLineFragment } from '../../api';
import { isInboundPlaceholderRow } from '../../../utils';

const getUnitQuantity = (row: InboundLineFragment) =>
  row.packSize * row.numberOfPacks;

export const useInboundShipmentColumns = () => {
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });
  const getSellPrice = (row: InboundLineFragment) =>
    isInboundPlaceholderRow(row) ? 0 : row.sellPricePerPack;
  const { getColumnPropertyAsString, getColumnProperty } = useColumnUtils();

  const columns = useColumns<InboundLineFragment | InboundItem>(
    [
      [
        getNotePopoverColumn(),
        {
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const noteSections = rowData.lines
                .map(({ batch, note }) => ({
                  header: batch ?? '',
                  body: note ?? '',
                }))
                .filter(({ body }) => !!body);

              return noteSections.length ? noteSections : null;
            } else {
              return rowData.note
                ? { header: rowData.batch ?? '', body: rowData.note }
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
              { path: ['lines', 'item', 'code'] },
              { path: ['item', 'code'], default: '' },
            ]),
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
          accessor: ({ rowData }) =>
            getColumnProperty(rowData, [{ path: ['batch'] }]),
          getSortValue: row =>
            getColumnPropertyAsString(row, [{ path: ['batch'], default: '' }]),
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
              { path: ['expiryDate'], default: '' },
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
        },
      ],
      {
        label: 'label.sell',
        key: 'sellPricePerPack',
        align: ColumnAlign.Right,
        width: 120,
        Cell: CurrencyCell,
        accessor: ({ rowData }) => {
          if ('lines' in rowData) {
            const { lines } = rowData;
            return ArrayUtils.ifTheSameElseDefault(
              lines.map(line => ({ sell: getSellPrice(line) })),
              'sell',
              ''
            );
          } else {
            return getSellPrice(rowData);
          }
        },
        getSortValue: rowData => {
          if ('lines' in rowData) {
            const { lines } = rowData;
            return ArrayUtils.ifTheSameElseDefault(
              lines,
              'sellPricePerPack',
              ''
            );
          } else {
            return getSellPrice(rowData);
          }
        },
      },
      [
        'packSize',
        {
          accessor: ({ rowData }) =>
            getColumnProperty(rowData, [
              { path: ['lines', 'packSize'], default: '' },
              { path: ['packSize'], default: '' },
            ]),
          getSortValue: row =>
            getColumnPropertyAsString(row, [
              { path: ['lines', 'packSize'], default: '' },
              { path: ['packSize'], default: '' },
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
      [
        'numberOfPacks',
        {
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
      getRowExpandColumn(),
      GenericColumnKey.Selection,
    ],
    { sortBy, onChangeSortBy: updateSortQuery },
    [sortBy, updateSortQuery]
  );

  return { columns, sortBy };
};

export const useExpansionColumns = (): Column<InboundLineFragment>[] =>
  useColumns([
    'batch',
    'expiryDate',
    'location',
    'numberOfPacks',
    'packSize',
    'costPricePerPack',
  ]);
