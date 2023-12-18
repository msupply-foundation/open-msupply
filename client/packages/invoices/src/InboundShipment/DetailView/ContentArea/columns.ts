import {
  getRowExpandColumn,
  GenericColumnKey,
  getNotePopoverColumn,
  useColumns,
  Column,
  ArrayUtils,
  useCurrency,
  useUrlQueryParams,
  ColumnAlign,
  PositiveNumberCell,
  TooltipTextCell,
  useColumnUtils,
} from '@openmsupply-client/common';
import { InboundItem } from './../../../types';
import { InboundLineFragment } from '../../api';
import { isInboundPlaceholderRow } from '../../../utils';

const getUnitQuantity = (row: InboundLineFragment) =>
  row.packSize * row.numberOfPacks;

export const useInboundShipmentColumns = () => {
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });
  const { c } = useCurrency();
  const getSellPrice = (row: InboundLineFragment) =>
    isInboundPlaceholderRow(row) ? '' : c(row.sellPricePerPack).format();
  const { getColumnEntityProperty, getColumnProperty } = useColumnUtils();

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
          accessor: ({ rowData }) =>
            getColumnEntityProperty({
              row: rowData,
              entity: 'item',
              key: 'code',
              defaults: { multiple: '' },
            }),
          getSortValue: row =>
            getColumnEntityProperty({
              row,
              entity: 'item',
              key: 'code',
              defaults: { multiple: '' },
            }),
        },
      ],
      [
        'itemName',
        {
          Cell: TooltipTextCell,
          accessor: ({ rowData }) =>
            getColumnEntityProperty({
              row: rowData,
              entity: 'item',
              key: 'name',
              defaults: { multiple: '' },
            }),
          getSortValue: row =>
            getColumnEntityProperty({
              row,
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
              defaults: {
                single: '',
                multiple: '',
              },
            }),
        },
      ],
      [
        'batch',
        {
          accessor: ({ rowData }) =>
            getColumnProperty({ row: rowData, key: 'batch' }),
          getSortValue: row =>
            String(getColumnProperty({ row, key: 'batch' }) ?? ''),
        },
      ],
      [
        'expiryDate',
        {
          accessor: ({ rowData }) =>
            getColumnProperty({ row: rowData, key: 'expiryDate' }),
          getSortValue: row =>
            String(getColumnProperty({ row, key: 'expiryDate' }) ?? ''),
        },
      ],
      [
        'location',
        {
          getSortValue: row =>
            String(
              getColumnEntityProperty({
                row,
                entity: 'location',
                key: 'code',
              }) ?? ''
            ),
          accessor: ({ rowData }) =>
            getColumnEntityProperty({
              row: rowData,
              entity: 'location',
              key: 'code',
              defaults: {
                single: '',
              },
            }),
        },
      ],
      {
        label: 'label.sell',
        key: 'sellPricePerPack',
        align: ColumnAlign.Right,
        width: 120,
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
            return c(
              ArrayUtils.ifTheSameElseDefault(lines, 'sellPricePerPack', '')
            ).format();
          } else {
            return getSellPrice(rowData);
          }
        },
      },
      [
        'packSize',
        {
          accessor: ({ rowData }) =>
            getColumnProperty({
              row: rowData,
              key: 'packSize',
              defaults: {
                single: '',
                multiple: '',
              },
            }),
          getSortValue: row =>
            String(
              getColumnProperty({
                row,
                key: 'packSize',
                defaults: {
                  single: '',
                  multiple: '',
                },
              }) ?? ''
            ),
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
          Cell: PositiveNumberCell,
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
