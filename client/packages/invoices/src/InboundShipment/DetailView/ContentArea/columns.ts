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
  ColumnDescription,
  NumUtils,
} from '@openmsupply-client/common';
import {
  getPackVariantCell,
  useIsPackVariantsEnabled,
} from '@openmsupply-client/system';
import { InboundItem } from './../../../types';
import { InboundLineFragment } from '../../api';
import { isInboundPlaceholderRow } from '../../../utils';

type InboundShipmentColumnDescription = ColumnDescription<
  InboundLineFragment | InboundItem
>;

const getUnitQuantity = (row: InboundLineFragment) =>
  NumUtils.floatMultiply(row.packSize, row.numberOfPacks);

export const useInboundShipmentColumns = () => {
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });
  const getSellPrice = (row: InboundLineFragment) =>
    isInboundPlaceholderRow(row) ? 0 : row.sellPricePerPack;
  const { getColumnPropertyAsString, getColumnProperty } = useColumnUtils();

  const isPackVariantsEnabled = useIsPackVariantsEnabled();

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

      ...((isPackVariantsEnabled
        ? [
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
                  if ('lines' in row)
                    return row.lines.map(l => l.packSize ?? 1);
                  else return [row?.packSize ?? 1];
                },
                getUnitName: row => {
                  if ('lines' in row)
                    return row.lines[0]?.item?.unitName ?? null;
                  else return row?.item?.unitName ?? null;
                },
              }),
              width: 130,
            },
          ]
        : [
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
          ]) as InboundShipmentColumnDescription[]),
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
      getRowExpandColumn(),
      GenericColumnKey.Selection,
    ],
    { sortBy, onChangeSortBy: updateSortQuery },
    [sortBy, updateSortQuery]
  );

  return { columns, sortBy };
};

export const useExpansionColumns = (): Column<InboundLineFragment>[] => {
  const isPackVariantsEnabled = useIsPackVariantsEnabled();

  return useColumns<InboundLineFragment>([
    'batch',
    'expiryDate',
    'location',
    ...(isPackVariantsEnabled
      ? [
          {
            key: 'packUnit',
            label: 'label.pack',
            sortable: false,
            Cell: getPackVariantCell({
              getItemId: row => row?.item?.id,
              getPackSizes: row => [row?.packSize ?? 1],
              getUnitName: row => row?.item?.unitName ?? null,
            }),
            width: 130,
          } as ColumnDescription<InboundLineFragment>,
        ]
      : ['packSize' as ColumnDescription<InboundLineFragment>]),
    'numberOfPacks',
    'costPricePerPack',
  ]);
};
