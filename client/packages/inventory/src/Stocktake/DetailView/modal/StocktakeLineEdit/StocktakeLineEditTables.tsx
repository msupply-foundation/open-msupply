import React, { useEffect, useMemo } from 'react';
import {
  alpha,
  RecordPatch,
  DataTable,
  useColumns,
  useTranslation,
  EnabledCheckboxCell,
  ColumnDescription,
  Theme,
  useTheme,
  useTableStore,
  CellProps,
  getReasonOptionTypes,
  usePreferences,
  useAuthContext,
  StoreModeNodeType,
  MaterialTable,
  useSimpleMaterialTable,
  ColumnDef,
  Typography,
  CheckBoxCell,
  ColumnType,
  DefaultCellProps,
  ExpiryDateInput,
  DateUtils,
  Formatter,
  RequiredNumberInputCell,
  RecordWithId,
} from '@openmsupply-client/common';
import { DraftStocktakeLine } from './utils';
import {
  getCampaignOrProgramColumn,
  getDonorColumn,
  getLocationInputColumn,
  getVolumePerPackFromVariant,
  ItemVariantInput,
  ReasonOptionRowFragment,
  ReasonOptionsSearchInput,
  useIsItemVariantsEnabled,
  VVMStatusSearchInput,
} from '@openmsupply-client/system';
import {
  StocktakeLineError,
  useStocktakeLineErrorContext,
} from '../../../context';
// Need to be re-exported when Legacy cells are removed
import { NumberInputCell } from '@openmsupply-client/common/src/ui/layout/tables/material-react-table/components/NumberInputCell';
import { CurrencyInputCell } from '@openmsupply-client/common/src/ui/layout/tables/material-react-table/components/CurrencyInputCell';
import { TextInputCell } from '@openmsupply-client/common/src/ui/layout/tables/material-react-table/components/TextInputCell';

interface StocktakeLineEditTableProps {
  isDisabled?: boolean;
  batches: DraftStocktakeLine[];
  update: (patch: RecordPatch<DraftStocktakeLine>) => void;
  isInitialStocktake: boolean;
  restrictedToLocationTypeId?: string | null;
  isVaccineItem?: boolean;
}

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);
};

const BatchInputCell = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isAutoFocus,
  ...props
}: CellProps<DraftStocktakeLine>): JSX.Element => (
  <TextInputCell {...props} autoFocus={props.rowIndex === 0} />
);

const getBatchColumn = (
  setter: DraftLineSetter,
  theme: Theme
): ColumnDescription<DraftStocktakeLine> =>
  [
    'batch',
    {
      minWidth: 150,
      maxWidth: 150,
      maxLength: 50,
      Cell: BatchInputCell,
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

const InventoryAdjustmentReasonInputCell = ({
  cell,
  row,
  updateFn,
  initialStocktake,
  error,
}: DefaultCellProps<DraftStocktakeLine> & {
  updateFn: (reasonOption: ReasonOptionRowFragment | null) => void;
  initialStocktake: boolean;
  error: StocktakeLineError | undefined;
}) => {
  const { store } = useAuthContext();

  const value = cell.getValue<ReasonOptionRowFragment | null>();

  const isAdjustmentReasonError =
    error?.__typename === 'AdjustmentReasonNotProvided' ||
    error?.__typename === 'AdjustmentReasonNotValid';

  const { snapshotNumberOfPacks, countedNumberOfPacks, item, countThisLine } =
    row.original;

  const isInventoryReduction =
    snapshotNumberOfPacks > (countedNumberOfPacks ?? 0);

  const disabled =
    // Haven't entered a count for this line yet
    typeof countedNumberOfPacks !== 'number' ||
    !countThisLine ||
    snapshotNumberOfPacks === countedNumberOfPacks;

  // https://github.com/openmsupply/open-msupply/pull/1252#discussion_r1119577142, this would ideally live in inventory package
  // and instead of this method we do all of the logic in InventoryAdjustmentReasonSearchInput and use it in `Cell` field of the column
  return (
    <ReasonOptionsSearchInput
      value={value}
      onChange={updateFn}
      type={getReasonOptionTypes({
        isInventoryReduction,
        isVaccine: item.isVaccine,
        isDispensary: store?.storeMode === StoreModeNodeType.Dispensary,
      })}
      inputProps={{
        error: isAdjustmentReasonError,
      }}
      disabled={disabled}
      initialStocktake={initialStocktake}
    />
  );
};

export const BatchTable = ({
  batches,
  update,
  isDisabled: disabled = false,
  isInitialStocktake,
  isVaccineItem = false,
}: StocktakeLineEditTableProps) => {
  const t = useTranslation();
  const itemVariantsEnabled = useIsItemVariantsEnabled();
  const { manageVvmStatusForStock } = usePreferences();
  const { errors } = useStocktakeLineErrorContext();

  const showVVMStatusColumn =
    (manageVvmStatusForStock && isVaccineItem) ?? false;

  const columns = useMemo(
    (): ColumnDef<DraftStocktakeLine>[] => [
      {
        accessorKey: 'countThisLine',
        header: t('label.count-this-line'),
        size: 60,
        Cell: ({ cell, row }) => (
          <CheckBoxCell
            cell={cell}
            updateFn={value =>
              update({ id: row.original.id, countThisLine: value })
            }
          />
        ),
      },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        Cell: ({ cell, row }) => (
          <TextInputCell
            cell={cell}
            updateFn={value => update({ id: row.original.id, batch: value })}
            isDisabled={disabled || !row.original.countThisLine}
            autoFocus={row.index === 0}
          />
        ),
      },
      {
        id: 'expiryDate',
        header: t('label.expiry-date'),
        accessorFn: row => DateUtils.getDateOrNull(row.expiryDate),
        Cell: ({ cell, row }) => {
          const value = cell.getValue<Date | null>();
          return (
            <ExpiryDateInput
              value={value}
              onChange={date =>
                update({
                  id: row.original.id,
                  expiryDate: Formatter.naiveDate(date),
                })
              }
            />
          );
        },
      },
      {
        id: 'itemVariant',
        header: t('label.item-variant'),
        accessorFn: row => row.itemVariant?.id || '',
        Cell: ({
          row: {
            original: { id, packSize, countThisLine, itemVariant, item },
          },
        }) => (
          <ItemVariantInput
            disabled={disabled || !countThisLine}
            selectedId={itemVariant?.id}
            itemId={item.id}
            width="100%"
            onChange={itemVariant =>
              update({
                id,
                itemVariantId: itemVariant?.id || null,
                itemVariant,
                volumePerPack: getVolumePerPackFromVariant({
                  packSize,
                  itemVariant,
                }),
              })
            }
          />
        ),
        includeColumn: itemVariantsEnabled,
      },
      {
        id: 'vvmStatus',
        header: t('label.vvm-status'),
        accessorFn: row => row.vvmStatus || '',
        Cell: ({
          row: {
            original: { id, vvmStatus, countThisLine, stockLine },
          },
        }) => (
          <VVMStatusSearchInput
            disabled={disabled || !countThisLine}
            selected={vvmStatus ?? null}
            onChange={vvmStatus => update({ id, vvmStatus })}
            useDefault={!stockLine} // Use default VVM status if not linked to stock line (i.e. new line)
          />
        ),
        includeColumn: showVVMStatusColumn,
      },
      {
        accessorKey: 'packSize',
        header: t('label.pack-size'),
        size: 100,
        accessorFn: row => row.packSize || row.item.defaultPackSize,
        Cell: ({ cell, row: { original: row } }) => (
          <RequiredNumberInputCell
            cell={cell}
            disabled={disabled || !row.countThisLine || !!row.stockLine}
            defaultValue={row.item.defaultPackSize}
            updateFn={packSize => update(getPackSizeChangePatch(row, packSize))}
          />
        ),
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'snapshotNumberOfPacks',
        header: t('label.snapshot-num-of-packs'),
        columnType: ColumnType.Number,
        size: 110,
        getIsError: rowData =>
          errors[rowData.id]?.__typename ===
          'SnapshotCountCurrentCountMismatchLine',
      },
      {
        accessorKey: 'countedNumberOfPacks',
        header: t('label.counted-num-of-packs'),
        size: 110,
        getIsError: rowData =>
          errors[rowData.id]?.__typename === 'StockLineReducedBelowZero',
        Cell: ({ cell, row: { original: row } }) => (
          <NumberInputCell
            cell={cell}
            disabled={disabled || !row.countThisLine}
            updateFn={value => update(getCountedPacksChangePatch(row, value))}
          />
        ),
      },
      {
        accessorKey: 'volumePerPack',
        header: t('label.volume-per-pack'),
        size: 110,
        Cell: ({ cell, row }) => (
          <NumberInputCell
            cell={cell}
            disabled={disabled || !row.original.countThisLine}
            decimalLimit={10}
            updateFn={value =>
              update({ id: row.original.id, volumePerPack: value })
            }
          />
        ),
      },
      {
        id: 'inventoryAdjustmentReasonInput',
        header: t('label.reason'),
        accessorFn: row => row.reasonOption || '',
        Cell: props => (
          <InventoryAdjustmentReasonInputCell
            updateFn={reasonOption =>
              update({ id: props.row.original.id, reasonOption })
            }
            initialStocktake={isInitialStocktake}
            error={errors[props.row.original.id]}
            {...props}
          />
        ),
      },
    ],
    [showVVMStatusColumn, itemVariantsEnabled, errors]
  );

  const table = useSimpleMaterialTable({
    tableId: 'stocktake-batches',
    columns,
    data: batches,
    noDataElement: (
      <Typography sx={{ color: 'gray.dark', padding: 2 }}>
        {t('label.add-new-line')}
      </Typography>
    ),
  });

  return <MaterialTable table={table} />;
};

export const PricingTable = ({
  batches,
  update,
  isDisabled,
}: StocktakeLineEditTableProps) => {
  const t = useTranslation();

  const columns = useMemo(
    (): ColumnDef<DraftStocktakeLine>[] => [
      {
        accessorKey: 'countThisLine',
        header: t('label.count-this-line'),
        size: 60,
        Cell: ({ cell, row }) => (
          <CheckBoxCell
            cell={cell}
            updateFn={value =>
              update({ id: row.original.id, countThisLine: value })
            }
          />
        ),
      },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        Cell: ({ cell, row }) => (
          <TextInputCell
            cell={cell}
            updateFn={value => update({ id: row.original.id, batch: value })}
            isDisabled={isDisabled || !row.original.countThisLine}
            autoFocus={row.index === 0}
          />
        ),
      },
      {
        accessorKey: 'sellPricePerPack',
        header: t('label.pack-sell-price'),
        Cell: ({ cell, row }) => (
          <CurrencyInputCell
            cell={cell}
            isDisabled={isDisabled || !row.original.countThisLine}
            updateFn={value =>
              update({ id: row.original.id, sellPricePerPack: value })
            }
          />
        ),
      },
      {
        accessorKey: 'costPricePerPack',
        header: t('label.pack-cost-price'),
        Cell: ({ cell, row }) => (
          <CurrencyInputCell
            cell={cell}
            isDisabled={isDisabled || !row.original.countThisLine}
            updateFn={value =>
              update({ id: row.original.id, costPricePerPack: value })
            }
          />
        ),
      },
    ],
    []
  );

  const table = useSimpleMaterialTable({
    tableId: 'stocktake-pricing',
    columns,
    data: batches,
    noDataElement: (
      <Typography sx={{ color: 'gray.dark', padding: 2 }}>
        {t('label.add-new-line')}
      </Typography>
    ),
  });

  return <MaterialTable table={table} />;
};

export const LocationTable = ({
  batches,
  update,
  isDisabled,
  restrictedToLocationTypeId,
}: StocktakeLineEditTableProps) => {
  const t = useTranslation();
  const theme = useTheme();
  const { allowTrackingOfStockByDonor } = usePreferences();

  useDisableStocktakeRows(batches);

  const columnDefinitions: ColumnDescription<DraftStocktakeLine>[] = [
    getCountThisLineColumn(update, theme),
    getBatchColumn(update, theme),
    [
      getLocationInputColumn(restrictedToLocationTypeId),
      {
        width: 300,
        setter: patch => update({ ...patch, countThisLine: true }),
        cellProps: {
          getVolumeRequired: (rowData: DraftStocktakeLine) =>
            rowData.volumePerPack *
            (rowData.countedNumberOfPacks ?? rowData.snapshotNumberOfPacks),
        },
      },
    ],
  ];
  if (allowTrackingOfStockByDonor) {
    columnDefinitions.push(
      getDonorColumn((id, donor) =>
        update({
          id,
          donorId: donor?.id ?? null,
          donorName: donor?.name ?? null,
          countThisLine: true,
        })
      )
    );
  }

  columnDefinitions.push(
    getCampaignOrProgramColumn(patch => update(patch)),
    [
      'comment',
      {
        label: 'label.stocktake-comment',
        Cell: TextInputCell,
        cellProps: {
          fullWidth: true,
        },
        width: 200,
        setter: patch => update({ ...patch, countThisLine: true }),
        accessor: ({ rowData }) => rowData.comment || '',
        defaultHideOnMobile: true,
      },
    ]
  );

  const columns = useColumns(columnDefinitions, {}, [columnDefinitions]);

  return (
    <DataTable
      id="stocktake-location"
      isDisabled={isDisabled}
      columns={columns}
      data={batches}
      noDataMessage={t('label.add-new-line')}
      dense
      gradientBottom={true}
    />
  );
};

const getPackSizeChangePatch = (
  row: DraftStocktakeLine,
  newPackSize: number
): RecordWithId & Partial<DraftStocktakeLine> => {
  const shouldClearSellPrice =
    row.item.defaultPackSize !== newPackSize &&
    row.item.itemStoreProperties?.defaultSellPricePerPack ===
      row.sellPricePerPack;

  return {
    id: row.id,
    packSize: newPackSize,
    volumePerPack:
      getVolumePerPackFromVariant({
        packSize: newPackSize,
        itemVariant: row.itemVariant,
      }) ?? 0,
    sellPricePerPack: shouldClearSellPrice ? 0 : row.sellPricePerPack,
  };
};

const getCountedPacksChangePatch = (
  row: DraftStocktakeLine,
  countedPacks: number
): RecordWithId & Partial<DraftStocktakeLine> => {
  // Clear the reason if there is now no adjustment, or direction changed
  const keepReason =
    typeof row.countedNumberOfPacks === 'number' &&
    countedPacks > row.snapshotNumberOfPacks ===
      row.countedNumberOfPacks > row.snapshotNumberOfPacks;

  return {
    id: row.id,
    countedNumberOfPacks: countedPacks,
    reasonOption: keepReason ? row.reasonOption : null,
  };
};
