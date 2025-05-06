import {
  getRowExpandColumn,
  GenericColumnKey,
  getNotePopoverColumn,
  useColumns,
  Column,
  ArrayUtils,
  ColumnAlign,
  TooltipTextCell,
  useColumnUtils,
  CurrencyCell,
  getLinesFromRow,
  usePreference,
  ColumnDescription,
  SortBy,
  useTranslation,
  PreferenceKey,
  getDosesPerUnitColumn,
  UNDEFINED_STRING_VALUE,
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

interface InboundShipmentColumnsProps {
  sortBy: SortBy<InboundLineFragment | InboundItem>;
  onChangeSortBy: (sort: string, dir: 'desc' | 'asc') => void;
}

export const useInboundShipmentColumns = ({
  sortBy,
  onChangeSortBy,
}: InboundShipmentColumnsProps) => {
  const t = useTranslation();
  const { data: preferences } = usePreference(
    PreferenceKey.DisplayVaccineInDoses
  );
  const { getColumnPropertyAsString, getColumnProperty } = useColumnUtils();
  const { getError } = useInboundShipmentLineErrorContext();
  const getCostPrice = (row: InboundLineFragment) =>
    isInboundPlaceholderRow(row) ? 0 : row.costPricePerPack / row.packSize;

  const columns: ColumnDescription<InboundLineFragment | InboundItem>[] = [
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
  ];

  if (preferences?.displayVaccineInDoses) {
    columns.push(getDosesPerUnitColumn(t));
  }

  columns.push(
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
    ]
  );

  if (preferences?.displayVaccineInDoses) {
    columns.push({
      key: 'doseQuantity',
      label: 'label.doses',
      width: 100,
      align: ColumnAlign.Right,
      accessor: ({ rowData }) => {
        if ('lines' in rowData) {
          const { lines } = rowData;
          const isVaccine = lines[0]?.item?.isVaccine ?? false;
          const unitQuantity = ArrayUtils.getUnitQuantity(lines);

          return isVaccine
            ? unitQuantity * (lines[0]?.item.doses ?? 1)
            : UNDEFINED_STRING_VALUE;
        } else {
          return getUnitQuantity(rowData) * rowData.item.doses;
        }
      },
    });
  }

  columns.push(
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
    getRowExpandColumn()
  );

  return useColumns(columns, { sortBy, onChangeSortBy }, [
    sortBy,
    onChangeSortBy,
  ]);
};

export const useExpansionColumns = (
  displayInDoses?: boolean
): Column<InboundLineFragment>[] => {
  const columns: ColumnDescription<InboundLineFragment>[] = [
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
  ];

  if (displayInDoses) {
    columns.push({
      key: 'doseQuantity',
      label: 'label.doses',
      width: 100,
      align: ColumnAlign.Right,
      accessor: ({ rowData }) => {
        const isVaccine = rowData.item?.isVaccine ?? false;
        const total = rowData.numberOfPacks * rowData.packSize;
        return isVaccine
          ? total * (rowData.item?.doses ?? 1)
          : UNDEFINED_STRING_VALUE;
      },
    });
  }

  columns.push(
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
    ]
  );

  return useColumns(columns, {}, []);
};
