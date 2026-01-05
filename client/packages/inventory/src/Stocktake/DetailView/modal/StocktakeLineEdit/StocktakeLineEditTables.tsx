import React, { useMemo } from 'react';
import {
  RecordPatch,
  useTranslation,
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
  ReasonOptionNodeType,
  TextInputCell,
  NumberInputCell,
  CurrencyInputCell,
} from '@openmsupply-client/common';
import { DraftStocktakeLine } from './utils';
import {
  CampaignOrProgramCell,
  DonorSearchInput,
  getVolumePerPackFromVariant,
  ItemVariantInput,
  LocationRowFragment,
  LocationSearchInput,
  ReasonOptionRowFragment,
  ReasonOptionsSearchInput,
  useIsItemVariantsEnabled,
  VVMStatusSearchInput,
} from '@openmsupply-client/system';
import {
  StocktakeLineError,
  useStocktakeLineErrorContext,
} from '../../../context';

interface StocktakeLineEditTableProps {
  disabled?: boolean;
  batches: DraftStocktakeLine[];
  update: (patch: RecordPatch<DraftStocktakeLine>) => void;
}

export const BatchTable = ({
  batches,
  update,
  disabled = false,
  isInitialStocktake,
  isVaccineItem = false,
}: StocktakeLineEditTableProps & {
  isVaccineItem: boolean;
  isInitialStocktake: boolean;
}) => {
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
            isError={!!errors[row.original.id]}
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
        size: 130,
        Cell: ({ cell, row }) => (
          <TextInputCell
            cell={cell}
            updateFn={value => update({ id: row.original.id, batch: value })}
            disabled={disabled || !row.original.countThisLine}
            autoFocus={row.index === 0}
          />
        ),
      },
      {
        id: 'expiryDate',
        header: t('label.expiry-date'),
        size: 160,
        accessorFn: row => DateUtils.getDateOrNull(row.expiryDate),
        Cell: ({ cell, row }) => {
          const value = cell.getValue<Date | null>();
          return (
            <ExpiryDateInput
              value={value}
              disabled={disabled || !row.original.countThisLine}
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
        size: 150,
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
        size: 150,
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
        size: 100,
        getIsError: rowData =>
          errors[rowData.id]?.__typename ===
          'SnapshotCountCurrentCountMismatchLine',
      },
      {
        accessorKey: 'countedNumberOfPacks',
        header: t('label.counted-num-of-packs'),
        size: 100,
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
        size: 100,
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
            disabled={disabled || !props.row.original.countThisLine}
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
  disabled,
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
            disabled={disabled || !row.original.countThisLine}
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
            disabled={disabled || !row.original.countThisLine}
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
            disabled={disabled || !row.original.countThisLine}
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
  disabled,
  restrictedToLocationTypeId,
}: StocktakeLineEditTableProps & {
  restrictedToLocationTypeId: string | null;
}) => {
  const t = useTranslation();
  const { allowTrackingOfStockByDonor } = usePreferences();

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
            disabled={disabled || !row.original.countThisLine}
            autoFocus={row.index === 0}
          />
        ),
      },
      {
        id: 'location',
        header: t('label.location'),
        Cell: ({ row: { original: row } }) => {
          return (
            <LocationSearchInput
              onChange={value => update({ id: row.id, location: value })}
              disabled={disabled || !row.countThisLine}
              selectedLocation={(row.location as LocationRowFragment) ?? null}
              volumeRequired={
                row.volumePerPack *
                (row.countedNumberOfPacks ?? row.snapshotNumberOfPacks)
              }
              restrictedToLocationTypeId={restrictedToLocationTypeId}
              fullWidth
            />
          );
        },
      },
      {
        id: 'donor',
        header: t('label.donor'),
        Cell: ({ row: { original: row } }) => (
          <DonorSearchInput
            donorId={row.donorId ?? null}
            onChange={donor =>
              update({
                id: row.id,
                donorId: donor?.id,
                donorName: donor?.name,
              })
            }
            disabled={disabled || !row.countThisLine}
            fullWidth
            clearable
          />
        ),
        includeColumn: allowTrackingOfStockByDonor,
      },
      {
        id: 'campaignOrProgram',
        header: t('label.campaign'),
        Cell: ({ row }) => (
          <CampaignOrProgramCell
            row={row.original}
            disabled={disabled || !row.original.countThisLine}
            updateFn={patch => update({ id: row.original.id, ...patch })}
          />
        ),
      },

      {
        accessorKey: 'comment',
        header: t('label.stocktake-comment'),
        size: 200,
        Cell: ({ cell, row }) => (
          <TextInputCell
            cell={cell}
            updateFn={value => update({ id: row.original.id, comment: value })}
            disabled={disabled || !row.original.countThisLine}
          />
        ),
        defaultHideOnMobile: true,
      },
    ],
    [allowTrackingOfStockByDonor]
  );

  const table = useSimpleMaterialTable({
    tableId: 'stocktake-location',
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

const InventoryAdjustmentReasonInputCell = ({
  cell,
  row,
  updateFn,
  initialStocktake,
  error,
  disabled,
}: DefaultCellProps<DraftStocktakeLine> & {
  updateFn: (reasonOption: ReasonOptionRowFragment | null) => void;
  initialStocktake: boolean;
  error: StocktakeLineError | undefined;
  disabled: boolean;
}) => {
  const { store } = useAuthContext();

  const value = cell.getValue<ReasonOptionRowFragment | null>();

  const isAdjustmentReasonError =
    error?.__typename === 'AdjustmentReasonNotProvided' ||
    error?.__typename === 'AdjustmentReasonNotValid';

  const { snapshotNumberOfPacks, countedNumberOfPacks, item } = row.original;

  const isInventoryReduction =
    snapshotNumberOfPacks > (countedNumberOfPacks ?? 0);

  const isDisabled =
    // Haven't entered a count for this line yet
    disabled ||
    typeof countedNumberOfPacks !== 'number' ||
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
      disabled={isDisabled}
      initialStocktake={initialStocktake}
      fallbackType={
        isInventoryReduction
          ? ReasonOptionNodeType.NegativeInventoryAdjustment
          : ReasonOptionNodeType.PositiveInventoryAdjustment
      }
    />
  );
};
