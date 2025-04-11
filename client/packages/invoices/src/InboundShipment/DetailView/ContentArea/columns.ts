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
  getLinesFromRow,
} from '@openmsupply-client/common';
import { InboundItem } from './../../../types';
import { InboundLineFragment } from '../../api';
import { isInboundPlaceholderRow } from '../../../utils';
import { useInboundShipmentLineErrorContext } from '../../context/inboundShipmentLineError';

const getUnitQuantity = (row: InboundLineFragment) =>
  row.packSize * row.numberOfPacks;

const getTotalCost = (row: InboundLineFragment) =>
  row.numberOfPacks * row.costPricePerPack;

const calculateRowTotalCost = (rowData: InboundLineFragment | InboundItem) => {
  if ('lines' in rowData) {
    return rowData.lines.reduce(
      (acc, line) => acc + line.numberOfPacks * line.costPricePerPack,
      0
    );
  } else {
    return getTotalCost(rowData);
  }
};

export const useInboundShipmentColumns = () => {
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });
  const getCostPrice = (row: InboundLineFragment) =>
    isInboundPlaceholderRow(row) ? 0 : row.costPricePerPack / row.packSize;
  const { getColumnPropertyAsString, getColumnProperty } = useColumnUtils();
  const { getError } = useInboundShipmentLineErrorContext();

  const columns = useColumns<InboundLineFragment | InboundItem>(
    [
      [
        GenericColumnKey.Selection,
        {
          getIsError: row =>
            getLinesFromRow(row).some(
              r => getError(r)?.__typename === 'LineLinkedToTransferredInvoice'
            ),
        },
      ],
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
            getColumnProperty(rowData, [
              { path: ['lines', 'batch'] },
              { path: ['batch'], default: '' },
            ]),
          getSortValue: row =>
            getColumnPropertyAsString(row, [
              { path: ['lines', 'batch'] },
              { path: ['batch'], default: '' },
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
          width: 150,
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
          accessor: ({ rowData }) =>
            getColumnProperty(rowData, [
              { path: ['lines', 'packSize'] },
              { path: ['packSize'], default: '' },
            ]),
          getSortValue: row =>
            getColumnPropertyAsString(row, [
              { path: ['lines', 'packSize'] },
              { path: ['packSize'], default: '' },
            ]),
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
        label: 'label.cost-per-unit',
        key: 'costPricePerUnit',
        align: ColumnAlign.Right,
        width: 120,
        Cell: CurrencyCell,
        accessor: ({ rowData }) => {
          if ('lines' in rowData) {
            const { lines } = rowData;
            return ArrayUtils.getAveragePrice(lines, 'costPricePerPack');
          } else {
            return getCostPrice(rowData);
          }
        },
        sortable: false,
      },
      {
        label: 'label.total',
        key: 'total',
        align: ColumnAlign.Right,
        width: 120,
        Cell: CurrencyCell,
        accessor: ({ rowData }) => calculateRowTotalCost(rowData),
        getSortValue: rowData => calculateRowTotalCost(rowData),
      },
      getRowExpandColumn(),
    ],
    { sortBy, onChangeSortBy: updateSortQuery },
    [sortBy, updateSortQuery]
  );

  return { columns, sortBy };
};

export const useExpansionColumns = (): Column<InboundLineFragment>[] => {
  return useColumns<InboundLineFragment>([
    'batch',
    'expiryDate',
    [
      'location',
      {
        accessor: ({ rowData }) => rowData.location?.code,
      },
    ],
    'packSize',
    'numberOfPacks',
    [
      'costPricePerPack',
      {
        label: 'label.cost',
        accessor: ({ rowData }) => rowData.costPricePerPack,
        Cell: CurrencyCell,
      },
    ],
    [
      'lineTotal',
      {
        label: 'label.line-total',
        accessor: ({ rowData }) => getTotalCost(rowData),
        Cell: CurrencyCell,
      },
    ],
  ]);
};
