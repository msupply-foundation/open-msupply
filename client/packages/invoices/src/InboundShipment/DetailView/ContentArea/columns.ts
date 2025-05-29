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
} from '@openmsupply-client/common';
import { InboundItem } from './../../../types';
import { InboundLineFragment } from '../../api';
import { isInboundPlaceholderRow } from '../../../utils';
import { useInboundShipmentLineErrorContext } from '../../context/inboundShipmentLineError';
import { getDosesQuantityColumn } from 'packages/invoices/src/DoseQtyColumn';

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
    PreferenceKey.ManageVaccinesInDoses,
    PreferenceKey.AllowTrackingOfStockByDonor
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
        defaultHideOnMobile: true,
      },
    ],
  ];

  if (preferences?.manageVaccinesInDoses) {
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
        defaultHideOnMobile: true,
      },
    ]
  );

  if (preferences?.manageVaccinesInDoses) {
    columns.push(getDosesQuantityColumn());
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
      defaultHideOnMobile: true,
    },
    {
      label: 'label.total',
      key: 'total',
      align: ColumnAlign.Right,
      width: 120,
      Cell: CurrencyCell,
      accessor: ({ rowData }) => calculateRowTotalCost(rowData),
      getSortValue: rowData => calculateRowTotalCost(rowData),
      defaultHideOnMobile: true,
    }
  );

  if (preferences?.allowTrackingOfStockByDonor) {
    columns.push({
      key: 'donorName',
      label: 'label.donor',
      accessor: ({ rowData }) =>
        getColumnProperty(rowData, [
          { path: ['lines', 'donor', 'name'] },
          { path: ['donor', 'name'], default: '' },
        ]),
      sortable: false,
    });
  }

  columns.push({
    key: 'campaign',
    label: 'label.campaign',
    accessor: ({ rowData }) =>
      getColumnProperty(rowData, [
        { path: ['lines', 'campaign', 'name'] },
        { path: ['campaign', 'name'], default: '' },
      ]),
    defaultHideOnMobile: true,
  });

  columns.push(getRowExpandColumn());

  return useColumns(columns, { sortBy, onChangeSortBy }, [
    sortBy,
    onChangeSortBy,
  ]);
};

export const useExpansionColumns = (
  withDoseColumns?: boolean
): Column<InboundLineFragment>[] => {
  const { data: preferences } = usePreference(
    PreferenceKey.AllowTrackingOfStockByDonor
  );

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

  if (withDoseColumns) {
    columns.push(getDosesQuantityColumn());
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

  if (preferences?.allowTrackingOfStockByDonor) {
    columns.push({
      key: 'donorName',
      label: 'label.donor',
      width: 175,
      accessor: ({ rowData }) => rowData.donor?.name,
      defaultHideOnMobile: true,
    });
  }

  columns.push({
    key: 'campaign',
    label: 'label.campaign',
    width: 100,
    accessor: ({ rowData }) => rowData.campaign?.name,
    defaultHideOnMobile: true,
  });

  return useColumns(columns, {}, []);
};
