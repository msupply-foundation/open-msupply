import {
  useColumns,
  getNotePopoverColumn,
  ColumnAlign,
  GenericColumnKey,
  SortBy,
  Column,
  useTranslation,
  useColumnUtils,
  NumberCell,
  CurrencyCell,
  ColumnDescription,
  useAuthContext,
  usePreference,
  PreferenceKey,
  getDosesPerUnitColumn,
} from '@openmsupply-client/common';
import { StockOutLineFragment } from '../../StockOut';
import { getDosesQuantityColumn } from '../../DoseQtyColumn';

interface UsePrescriptionColumnOptions {
  sortBy: SortBy<StockOutLineFragment>;
  onChangeSortBy: (sort: string, dir: 'desc' | 'asc') => void;
}

export const usePrescriptionColumn = ({
  sortBy,
  onChangeSortBy,
}: UsePrescriptionColumnOptions): Column<StockOutLineFragment>[] => {
  const t = useTranslation();
  const { getColumnPropertyAsString, getColumnProperty } = useColumnUtils();
  const { data: OMSPrefs } = usePreference(PreferenceKey.ManageVaccinesInDoses);
  const { store: { preferences } = {} } = useAuthContext();
  const hasPrescribedQty = preferences?.editPrescribedQuantityOnPrescription;

  const columns: ColumnDescription<StockOutLineFragment>[] = [
    GenericColumnKey.Selection,
    [
      getNotePopoverColumn(t('label.directions')),
      {
        accessor: ({ rowData }) => {
          const noteSection = [
            {
              header: null,
              body: rowData.note ?? '',
            },
          ];
          return rowData.note ? noteSection : null;
        },
      },
    ],
    [
      'itemCode',
      {
        getSortValue: row =>
          getColumnPropertyAsString<StockOutLineFragment>(row, [
            { path: ['item', 'code'], default: '' },
          ]),
        accessor: ({ rowData }) =>
          getColumnProperty(rowData, [{ path: ['item', 'code'], default: '' }]),
        isSticky: true,
      },
    ],
    [
      'itemName',
      {
        getSortValue: row =>
          getColumnPropertyAsString(row, [{ path: ['itemName'], default: '' }]),
        accessor: ({ rowData }) =>
          getColumnProperty(rowData, [{ path: ['itemName'], default: '' }]),
      },
    ],
    [
      'batch',
      {
        getSortValue: row =>
          getColumnPropertyAsString(row, [{ path: ['batch'], default: '' }]),
        accessor: ({ rowData }) =>
          getColumnProperty(rowData, [{ path: ['batch'] }]),
      },
    ],
    [
      'expiryDate',
      {
        getSortValue: row =>
          getColumnPropertyAsString(row, [
            { path: ['expiryDate'], default: '' },
          ]),
        accessor: ({ rowData }) =>
          getColumnProperty(rowData, [{ path: ['expiryDate'] }]),
      },
    ],
    [
      'location',
      {
        width: 100,
        getSortValue: row =>
          getColumnPropertyAsString(row, [
            { path: ['location', 'code'], default: '' },
          ]),
        accessor: ({ rowData }) =>
          getColumnProperty(rowData, [{ path: ['location', 'code'] }]),
      },
    ],
    [
      'itemUnit',
      {
        getSortValue: row =>
          getColumnPropertyAsString(row, [
            { path: ['item', 'unitName'], default: '' },
          ]),
        accessor: ({ rowData }) =>
          getColumnProperty(rowData, [
            { path: ['item', 'unitName'], default: '' },
          ]),
      },
    ],
    [
      'packSize',
      {
        getSortValue: row =>
          getColumnPropertyAsString(row, [{ path: ['packSize'], default: '' }]),
        accessor: ({ rowData }) =>
          getColumnProperty(rowData, [{ path: ['packSize'] }]),
      },
    ],
  ];

  if (OMSPrefs?.manageVaccinesInDoses) {
    columns.push(getDosesPerUnitColumn(t));
  }

  columns.push([
    'unitQuantity',
    {
      accessor: ({ rowData }) => rowData.packSize * rowData.numberOfPacks,
      getSortValue: rowData => rowData.packSize * rowData.numberOfPacks,
    },
  ]);

  if (OMSPrefs?.manageVaccinesInDoses) {
    columns.push(getDosesQuantityColumn());
  }

  if (hasPrescribedQty) {
    columns.push({
      label: 'label.prescribed-quantity',
      key: 'prescribedQuantity',
      align: ColumnAlign.Right,
      accessor: ({ rowData }) => rowData.prescribedQuantity ?? 0,
      getSortValue: rowData => rowData.prescribedQuantity ?? 0,
    });
  }

  columns.push(
    [
      'numberOfPacks',
      {
        Cell: NumberCell,
        getSortValue: row => row.numberOfPacks,
        accessor: ({ rowData }) => rowData.numberOfPacks,
      },
    ],
    {
      label: 'label.unit-price',
      key: 'sellPricePerUnit',
      align: ColumnAlign.Right,
      Cell: CurrencyCell,
      accessor: ({ rowData }) =>
        !!rowData.batch
          ? (rowData.sellPricePerPack ?? 0) / rowData.packSize
          : 0,
      getSortValue: rowData =>
        !!rowData.batch
          ? (rowData.sellPricePerPack ?? 0) / rowData.packSize
          : 0,
    },
    {
      label: 'label.line-total',
      key: 'lineTotal',
      align: ColumnAlign.Right,
      Cell: CurrencyCell,
      accessor: ({ rowData }) =>
        (rowData.sellPricePerPack ?? 0) * rowData.numberOfPacks,
      getSortValue: rowData =>
        (rowData.sellPricePerPack ?? 0) * rowData.numberOfPacks,
    },
    {
      label: 'label.purchase-cost-price',
      key: 'totalCostPrice',
      align: ColumnAlign.Right,
      Cell: CurrencyCell,
      accessor: ({ rowData }) =>
        (rowData.costPricePerPack ?? 0) * rowData.numberOfPacks,
      getSortValue: rowData =>
        (rowData.costPricePerPack ?? 0) * rowData.numberOfPacks,
    }
  );

  return useColumns(columns, { onChangeSortBy, sortBy }, [sortBy]);
};
