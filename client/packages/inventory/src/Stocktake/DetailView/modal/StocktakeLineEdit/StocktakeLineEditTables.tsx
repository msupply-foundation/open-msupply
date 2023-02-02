import React, { FC, useEffect } from 'react';
import {
  TextInputCell,
  alpha,
  RecordPatch,
  DataTable,
  useColumns,
  CurrencyInputCell,
  useTranslation,
  getExpiryDateInputColumn,
  PositiveNumberInputCell,
  NonNegativeDecimalCell,
  EnabledCheckboxCell,
  ColumnDescription,
  Theme,
  useTheme,
  useTableStore,
  CellProps,
} from '@openmsupply-client/common';
import {
  getLocationInputColumn,
  InventoryAdjustmentReasonRowFragment,
  InventoryAdjustmentReasonSearchInput,
} from '@openmsupply-client/system';
import { DraftStocktakeLine } from './utils';

interface StocktakeLineEditTableProps {
  isDisabled?: boolean;
  batches: DraftStocktakeLine[];
  update: (patch: RecordPatch<DraftStocktakeLine>) => void;
  mutableUpdate: (patch: RecordPatch<DraftStocktakeLine>) => void;
  isError?: boolean;
}

const expiryDateColumn = getExpiryDateInputColumn<DraftStocktakeLine>();

type DraftLineSetter = (
  patch: Partial<DraftStocktakeLine> & { id: string }
) => void;

const useDisableStocktakeRows = (rows?: DraftStocktakeLine[]) => {
  const { setDisabledRows } = useTableStore();
  useEffect(() => {
    const disabledRows = rows
      ?.filter(row => !row.countThisLine)
      .map(({ id }) => id);
    if (disabledRows) setDisabledRows(disabledRows);
  }, [rows]);
};

const getBatchColumn = (
  setter: DraftLineSetter,
  theme: Theme
): ColumnDescription<DraftStocktakeLine> =>
  [
    'batch',
    {
      width: 150,
      maxWidth: 150,
      maxLength: 50,
      Cell: TextInputCell,
      setter: patch => setter({ ...patch, countThisLine: true }),
      backgroundColor: alpha(theme.palette.background.menu, 0.4),
      accessor: ({ rowData }) => rowData.batch || '',
    },
  ] as ColumnDescription<DraftStocktakeLine>;

const getCountThisLineColumn = (
  setter: DraftLineSetter,
  theme: Theme
): ColumnDescription<DraftStocktakeLine> => {
  return {
    key: 'countThisLine',
    label: 'label.count-this-line',
    width: 80,
    Cell: EnabledCheckboxCell,
    setter: patch => setter({ ...patch }),
    backgroundColor: alpha(theme.palette.background.menu, 0.4),
  };
};

const getInventoryAdjustmentReasonInputColumn = (
  setter: DraftLineSetter,
  isError: boolean
): ColumnDescription<DraftStocktakeLine> => {
  return {
    key: 'inventoryAdjustmentReasonInput',
    label: 'label.reason',
    sortable: false,
    width: 120,
    accessor: ({ rowData }) => rowData.inventoryAdjustmentReason || '',
    Cell: ({ rowData, column, rows, columnIndex, rowIndex }) => {
      const value = column.accessor({
        rowData,
        rows,
      }) as InventoryAdjustmentReasonRowFragment | null;

      const onChange = (
        inventoryAdjustmentReason: InventoryAdjustmentReasonRowFragment | null
      ) => {
        setter({ ...rowData, inventoryAdjustmentReason });
      };

      const autoFocus = columnIndex === 0 && rowIndex === 0;
      const stockReduction =
        rowData.snapshotNumberOfPacks -
        (rowData.countedNumberOfPacks || rowData.snapshotNumberOfPacks);

      return (
        <InventoryAdjustmentReasonSearchInput
          autoFocus={autoFocus}
          value={value}
          width={column.width}
          onChange={onChange}
          stockReduction={stockReduction}
          isError={isError}
        />
      );
    },
  };
};

export const BatchTable: FC<StocktakeLineEditTableProps> = ({
  batches,
  update,
  mutableUpdate,
  isDisabled = false,
  isError = false,
}) => {
  const t = useTranslation('inventory');
  const theme = useTheme();
  useDisableStocktakeRows(batches);

  const PackSizeCell = (props: CellProps<DraftStocktakeLine>) => (
    <PositiveNumberInputCell
      {...props}
      isDisabled={!!props.rowData.stockLine}
    />
  );

  const columns = useColumns<DraftStocktakeLine>([
    getCountThisLineColumn(update, theme),
    getBatchColumn(update, theme),
    {
      key: 'snapshotNumberOfPacks',
      label: 'label.num-packs',
      width: 100,
      setter: patch => update({ ...patch, countThisLine: true }),
      accessor: ({ rowData }) => rowData.snapshotNumberOfPacks || '',
    },
    {
      key: 'packSize',
      label: 'label.pack-size',
      width: 100,
      Cell: PackSizeCell,
      setter: patch => update({ ...patch, countThisLine: true }),
    },
    {
      key: 'countedNumberOfPacks',
      label: 'label.counted-num-of-packs',
      width: 100,
      Cell: NonNegativeDecimalCell,
      setter: patch => mutableUpdate({ ...patch, countThisLine: true }),
      accessor: ({ rowData }) => rowData.countedNumberOfPacks || '',
    },
    [
      expiryDateColumn,
      {
        width: 120,
        setter: patch => update({ ...patch, countThisLine: true }),
      },
    ],
    getInventoryAdjustmentReasonInputColumn(update, isError),
  ]);

  return (
    <DataTable
      id="stocktake-batch"
      isDisabled={isDisabled}
      columns={columns}
      data={batches}
      noDataMessage={t('label.add-new-line')}
      dense
    />
  );
};

export const PricingTable: FC<StocktakeLineEditTableProps> = ({
  batches,
  update,
  isDisabled,
}) => {
  const theme = useTheme();
  const t = useTranslation('inventory');
  const columns = useColumns<DraftStocktakeLine>([
    getCountThisLineColumn(update, theme),
    getBatchColumn(update, theme),
    [
      'sellPricePerPack',
      {
        Cell: CurrencyInputCell,
        width: 200,
        setter: patch => update({ ...patch, countThisLine: true }),
      },
    ],
    [
      'costPricePerPack',
      {
        Cell: CurrencyInputCell,
        width: 200,
        setter: patch => update({ ...patch, countThisLine: true }),
      },
    ],
  ]);

  return (
    <DataTable
      id="stocktake-pricing"
      isDisabled={isDisabled}
      columns={columns}
      data={batches}
      noDataMessage={t('label.add-new-line')}
      dense
    />
  );
};

export const LocationTable: FC<StocktakeLineEditTableProps> = ({
  batches,
  update,
  isDisabled,
}) => {
  const theme = useTheme();
  const t = useTranslation('inventory');
  const columns = useColumns<DraftStocktakeLine>([
    getCountThisLineColumn(update, theme),
    getBatchColumn(update, theme),
    [
      getLocationInputColumn(),
      {
        width: 300,
        setter: patch => update({ ...patch, countThisLine: true }),
      },
    ],
    [
      'comment',
      {
        label: 'label.stocktake-comment',
        Cell: TextInputCell,
        width: 200,
        setter: patch => update({ ...patch, countThisLine: true }),
        accessor: ({ rowData }) => rowData.comment || '',
      },
    ],
  ]);

  return (
    <DataTable
      id="stocktake-location"
      isDisabled={isDisabled}
      columns={columns}
      data={batches}
      noDataMessage={t('label.add-new-line')}
      dense
    />
  );
};
