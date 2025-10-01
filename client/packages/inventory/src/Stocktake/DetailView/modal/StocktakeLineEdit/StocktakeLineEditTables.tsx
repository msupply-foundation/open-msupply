import React, { useEffect, useMemo } from 'react';
import {
  TextInputCell,
  alpha,
  RecordPatch,
  DataTable,
  useColumns,
  CurrencyInputCell,
  useTranslation,
  getExpiryDateInputColumn,
  EnabledCheckboxCell,
  ColumnDescription,
  Theme,
  useTheme,
  useTableStore,
  CellProps,
  getColumnLookupWithOverrides,
  NumberInputCell,
  ColumnAlign,
  NumberCell,
  getReasonOptionTypes,
  usePreferences,
  useAuthContext,
  StoreModeNodeType,
  ReasonOptionNodeType,
} from '@openmsupply-client/common';
import { DraftStocktakeLine } from './utils';
import {
  getCampaignOrProgramColumn,
  getDonorColumn,
  getLocationInputColumn,
  getVolumePerPackFromVariant,
  ItemVariantInputCell,
  PackSizeEntryCell,
  ReasonOptionRowFragment,
  ReasonOptionsSearchInput,
  useIsItemVariantsEnabled,
  useReasonOptions,
  VVMStatusInputCell,
} from '@openmsupply-client/system';
import {
  useStocktakeLineErrorContext,
  UseStocktakeLineErrors,
} from '../../../context';

interface StocktakeLineEditTableProps {
  isDisabled?: boolean;
  batches: DraftStocktakeLine[];
  update: (patch: RecordPatch<DraftStocktakeLine>) => void;
  isInitialStocktake?: boolean;
  restrictedToLocationTypeId?: string | null;
  isVaccineItem?: boolean;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);
};

const BatchInputCell = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isAutoFocus,
  ...props
}: CellProps<DraftStocktakeLine>): JSX.Element => (
  <TextInputCell {...props} isAutoFocus={props.rowIndex === 0} />
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

const getInventoryAdjustmentReasonInputColumn = (
  setter: DraftLineSetter,
  { getError }: UseStocktakeLineErrors,
  initialStocktake?: boolean
): ColumnDescription<DraftStocktakeLine> => {
  return {
    key: 'inventoryAdjustmentReasonInput',
    label: 'label.reason',
    sortable: false,
    width: 120,
    accessor: ({ rowData }) => rowData.reasonOption || '',
    Cell: ({ rowData, column, columnIndex, rowIndex }) => {
      const { store } = useAuthContext();

      const value = column.accessor({
        rowData,
      }) as ReasonOptionRowFragment | null;

      const onChange = (reasonOption: ReasonOptionRowFragment | null) => {
        setter({ ...rowData, reasonOption });
      };

      const autoFocus = columnIndex === 0 && rowIndex === 0;

      const errorType = getError(rowData)?.__typename;
      const isAdjustmentReasonError =
        errorType === 'AdjustmentReasonNotProvided' ||
        errorType === 'AdjustmentReasonNotValid';

      const isInventoryReduction =
        rowData.snapshotNumberOfPacks > (rowData?.countedNumberOfPacks ?? 0);

      const disabled =
        // Haven't entered a count for this line yet
        typeof rowData.countedNumberOfPacks !== 'number' ||
        !rowData.countThisLine ||
        rowData.snapshotNumberOfPacks === rowData.countedNumberOfPacks;

      // https://github.com/openmsupply/open-msupply/pull/1252#discussion_r1119577142, this would ideally live in inventory package
      // and instead of this method we do all of the logic in InventoryAdjustmentReasonSearchInput and use it in `Cell` field of the column
      return (
        <ReasonOptionsSearchInput
          autoFocus={autoFocus}
          value={value}
          width={Number(column.width)}
          onChange={onChange}
          type={getReasonOptionTypes({
            isInventoryReduction,
            isVaccine: rowData.item.isVaccine,
            isDispensary: store?.storeMode === StoreModeNodeType.Dispensary,
          })}
          fallbackType={
            isInventoryReduction
              ? ReasonOptionNodeType.NegativeInventoryAdjustment
              : ReasonOptionNodeType.PositiveInventoryAdjustment
          }
          inputProps={{
            error: isAdjustmentReasonError,
          }}
          disabled={disabled}
          initialStocktake={initialStocktake}
        />
      );
    },
  };
};

export const BatchTable = ({
  batches,
  update,
  isDisabled = false,
  isInitialStocktake,
  isVaccineItem = false,
}: StocktakeLineEditTableProps) => {
  const t = useTranslation();
  const theme = useTheme();
  const itemVariantsEnabled = useIsItemVariantsEnabled();
  const { manageVvmStatusForStock } = usePreferences();
  useDisableStocktakeRows(batches);
  const { data: reasonOptions, isLoading } = useReasonOptions();
  const errorsContext = useStocktakeLineErrorContext();

  const showVVMStatusColumn =
    (manageVvmStatusForStock && isVaccineItem) ?? false;

  const columnDefinitions = useMemo(() => {
    const columnDefinitions: ColumnDescription<DraftStocktakeLine>[] = [
      getCountThisLineColumn(update, theme),
      getBatchColumn(update, theme),
      [
        expiryDateColumn,
        {
          width: 160,
          setter: patch => update({ ...patch, countThisLine: true }),
        },
      ],
    ];

    if (itemVariantsEnabled) {
      columnDefinitions.push({
        key: 'itemVariantId',
        label: 'label.item-variant',
        width: 170,
        Cell: props => (
          <ItemVariantInputCell {...props} itemId={props.rowData.item.id} />
        ),
        setter: patch => {
          update({
            ...patch,
            volumePerPack: getVolumePerPackFromVariant(patch) ?? 0,
          });
        },
      });
    }

    if (showVVMStatusColumn) {
      columnDefinitions.push({
        key: 'vvmStatus',
        label: 'label.vvm-status',
        width: 170,
        cellProps: {
          useDefault: true,
        },
        Cell: props => <VVMStatusInputCell {...props} />,
        setter: patch => update({ ...patch }),
      });
    }

    columnDefinitions.push(
      getColumnLookupWithOverrides('packSize', {
        Cell: PackSizeEntryCell<DraftStocktakeLine>,
        label: 'label.pack-size',
        cellProps: {
          getIsDisabled: (rowData: DraftStocktakeLine) => !!rowData?.stockLine,
        },
        align: ColumnAlign.Left,
        accessor: ({ rowData }) =>
          rowData.packSize ?? rowData.item?.defaultPackSize,
        defaultHideOnMobile: true,
        setter: patch => {
          const shouldClearSellPrice =
            patch.item?.defaultPackSize !== patch.packSize &&
            patch.item?.itemStoreProperties?.defaultSellPricePerPack ===
              patch.sellPricePerPack;

          update({
            ...patch,
            volumePerPack: getVolumePerPackFromVariant(patch) ?? 0,
            sellPricePerPack: shouldClearSellPrice ? 0 : patch.sellPricePerPack,
          });
        },
      }),
      {
        key: 'snapshotNumberOfPacks',
        label: 'label.snapshot-num-of-packs',
        align: ColumnAlign.Right,
        width: 100,
        Cell: NumberCell,
        getIsError: rowData =>
          errorsContext.getError(rowData)?.__typename ===
          'SnapshotCountCurrentCountMismatchLine',
        setter: patch => update({ ...patch, countThisLine: true }),
        accessor: ({ rowData }) => rowData.snapshotNumberOfPacks || '0',
      },
      {
        key: 'countedNumberOfPacks',
        label: 'label.counted-num-of-packs',
        width: 100,
        getIsError: rowData =>
          errorsContext.getError(rowData)?.__typename ===
          'StockLineReducedBelowZero',
        Cell: NumberInputCell,
        cellProps: { decimalLimit: 2, min: 0 },
        setter: patch => {
          // If counted number of packs was changed to result in no adjustment we
          // should remove inventoryAdjustmentReason, otherwise could have a
          // reason on a line with no adjustments
          const reasonOption =
            !patch.countedNumberOfPacks ||
            patch.snapshotNumberOfPacks == patch.countedNumberOfPacks
              ? null
              : patch.reasonOption;
          update({ ...patch, countThisLine: true, reasonOption });
        },
        accessor: ({ rowData }) => rowData.countedNumberOfPacks,
      },
      {
        key: 'volumePerPack',
        label: t('label.volume-per-pack'),
        Cell: NumberInputCell,
        cellProps: { decimalLimit: 10 },
        width: 100,
        accessor: ({ rowData }) => rowData?.volumePerPack,
        setter: patch => update({ ...patch, countThisLine: true }),
      },
      getInventoryAdjustmentReasonInputColumn(
        update,
        errorsContext,
        isInitialStocktake
      )
    );

    return columnDefinitions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    itemVariantsEnabled,
    errorsContext,
    reasonOptions,
    isLoading,
    isInitialStocktake,
    showVVMStatusColumn,
  ]);

  const columns = useColumns<DraftStocktakeLine>(columnDefinitions, {}, [
    columnDefinitions,
  ]);

  return (
    <DataTable
      id="stocktake-batch"
      isDisabled={isDisabled}
      columns={columns}
      data={batches}
      noDataMessage={t('label.add-new-line')}
      dense
      gradientBottom={true}
    />
  );
};

export const PricingTable = ({
  batches,
  update,
  isDisabled,
}: StocktakeLineEditTableProps) => {
  const theme = useTheme();
  const t = useTranslation();
  useDisableStocktakeRows(batches);

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
      gradientBottom={true}
    />
  );
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
