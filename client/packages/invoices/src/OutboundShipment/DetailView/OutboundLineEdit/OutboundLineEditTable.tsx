import React, { useEffect, useMemo } from 'react';
import {
  Divider,
  Box,
  DataTable,
  useTranslation,
  TableCell,
  styled,
  useFormatNumber,
  Tooltip,
  NumUtils,
  Typography,
  useTableStore,
  usePreferences,
  ColumnDef,
  MaterialTable,
  UNDEFINED_STRING_VALUE,
  useAuthContext,
  useSimpleMaterialTable,
  useFeatureFlags,
  ColumnType,
  Formatter,
  useIntlUtils,
  QuantityUtils,
  NumericTextInput,
  useDebounceCallback,
  useBufferState,
} from '@openmsupply-client/common';
import { useOutboundLineEditColumns } from './columns';
import {
  CurrencyRowFragment,
  // VVMStatusInputCell,
} from '@openmsupply-client/system';
import {
  AllocateInType,
  useAllocationContext,
  getAllocatedQuantity,
  canAutoAllocate,
  DraftStockOutLineFragment,
  getDoseQuantity,
} from '../../../StockOut';
import { min } from 'lodash';
import { useDisableVvmRows } from '../../../useDisableVvmRows';

export interface OutboundLineEditTableProps {
  currency?: CurrencyRowFragment | null;
  isExternalSupplier: boolean;
}

const PlaceholderCell = styled(TableCell)(({ theme }) => ({
  fontSize: 12,
  padding: '4px 20px 4px 12px',
  color: theme.palette.secondary.main,
}));

const TotalCell = styled(TableCell)(({ theme }) => ({
  fontSize: 14,
  padding: '8px 12px 4px 12px',
  fontWeight: 'bold',
  position: 'sticky',
  bottom: 0,
  background: theme.palette.background.white,
  borderTop: `1px solid ${theme.palette.divider}`,
}));

const PlaceholderRow = ({
  quantity,
  extraColumnOffset,
  dosesPerUnit,
}: {
  quantity: number | null;
  extraColumnOffset: number;
  dosesPerUnit?: number;
}) => {
  const t = useTranslation();

  const formattedValue = useFormatNumber().round(quantity ?? 0, 2);
  const tooltip = useFormatNumber().round(quantity ?? 0, 10);

  // TODO - maybe should be editable? Can't clear when manually allocating..
  return quantity === null ? null : (
    <tr>
      <PlaceholderCell
        colSpan={5 + extraColumnOffset}
        sx={{ color: 'secondary.main' }}
      >
        {t('label.placeholder')}
      </PlaceholderCell>
      <PlaceholderCell style={{ textAlign: 'right', paddingRight: '14px' }}>
        1
      </PlaceholderCell>
      {!!dosesPerUnit && (
        <PlaceholderCell style={{ textAlign: 'right', paddingRight: '14px' }}>
          {dosesPerUnit}
        </PlaceholderCell>
      )}
      <PlaceholderCell colSpan={dosesPerUnit ? 2 : 3}></PlaceholderCell>
      <Tooltip title={tooltip}>
        <PlaceholderCell style={{ textAlign: 'right' }}>
          {!!NumUtils.hasMoreThanTwoDp(quantity)
            ? `${formattedValue}...`
            : formattedValue}
        </PlaceholderCell>
      </Tooltip>
    </tr>
  );
};

const TotalRow = ({
  allocatedQuantity,
  extraColumnOffset,
}: {
  allocatedQuantity: number;
  extraColumnOffset: number;
}) => {
  const t = useTranslation();
  const formattedValue = useFormatNumber().round(allocatedQuantity, 2);
  const tooltip = useFormatNumber().round(allocatedQuantity, 10);

  return (
    <tr>
      <TotalCell colSpan={3}>{t('label.total-quantity')}</TotalCell>
      <TotalCell colSpan={6 + extraColumnOffset}></TotalCell>
      <Tooltip title={tooltip}>
        <TotalCell
          style={{
            textAlign: 'right',
            paddingRight: 20,
          }}
        >
          {!!NumUtils.hasMoreThanTwoDp(allocatedQuantity)
            ? `${formattedValue}...`
            : formattedValue}
        </TotalCell>
      </Tooltip>
      <TotalCell colSpan={2} />
    </tr>
  );
};

export const OutboundLineEditTable = ({
  currency,
  isExternalSupplier,
}: OutboundLineEditTableProps) => {
  const { tableUsabilityImprovements } = useFeatureFlags();
  const t = useTranslation();
  const { format } = useFormatNumber();
  const tableStore = useTableStore();
  const prefs = usePreferences();
  const { store } = useAuthContext();
  const { getPlural } = useIntlUtils();

  const {
    draftLines,
    placeholderQuantity,
    nonAllocatableLines,
    allocateIn,
    allocatedQuantity,
    item,
    manualAllocate,
    setVvmStatus,
  } = useAllocationContext(state => {
    const { placeholderUnits, item, allocateIn } = state;

    const inDoses = allocateIn.type === AllocateInType.Doses;
    return {
      ...state,
      // In packs & units: we show totals in units
      // In doses: we show totals in doses
      allocatedQuantity: getAllocatedQuantity({
        draftLines: state.draftLines,
        allocateIn: inDoses ? allocateIn : { type: AllocateInType.Units },
      }),
      placeholderQuantity:
        placeholderUnits !== null && inDoses
          ? (placeholderUnits ?? 0) * (item?.doses || 1)
          : placeholderUnits,
    };
  });

  const allocate = (
    key: string,
    value: number,
    options?: {
      allocateInType?: AllocateInType;
      preventPartialPacks?: boolean;
    }
  ) => {
    const num = Number.isNaN(value) ? 0 : value;
    return manualAllocate(key, num, format, t, options);
  };

  const columns = useOutboundLineEditColumns({
    allocate,
    item,
    currency,
    isExternalSupplier,
    allocateIn: allocateIn,
    setVvmStatus,
  });

  const packSize =
    allocateIn.type === AllocateInType.Packs ? allocateIn.packSize : undefined;

  const unit = Formatter.sentenceCase(item?.unitName ?? t('label.unit'));
  const pluralisedUnitName = getPlural(unit, 2);

  const mrtColumns = useMemo(() => {
    const cols: ColumnDef<DraftStockOutLineFragment>[] = [
      {
        id: 'canAllocate',
        header: '',
        accessorFn: row => canAutoAllocate(row, packSize),
        size: 0,
        Cell: ({ renderedCellValue }) => {
          return renderedCellValue ? '✓' : '';
        },
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        size: 60,
        // Cell: getBatchWithVariantCell(
        //   item?.id ?? '',
        //   allocateIn.type === AllocateInType.Doses
        // ),
      },
      {
        accessorKey: 'expiryDate',
        header: t('label.expiry-date'),
        size: 120,
        columnType: ColumnType.Date,
      },
      // {
      //   accessorKey: 'vvmStatus',
      //   header: t('label.vvm-status'),
      //   Cell: ({ row }) => (
      //     <VVMStatusInputCell
      //       onChange={setVvmStatus}
      //       selected={row.original.vvmStatus}
      //     />
      //   ),
      //   size: 80,
      //   // defaultHideOnMobile: true,
      //   includeColumn:
      //     prefs.manageVvmStatusForStock || prefs.sortByVvmStatusThenExpiry,
      // },
      {
        id: 'campaign',
        header: t('label.campaign'),
        accessorFn: row => row?.campaign?.name ?? row?.program?.name ?? '',
      },
      {
        accessorKey: 'location.code',
        header: t('label.location'),
      },
      {
        accessorKey: 'donor',
        header: t('label.donor'),
        accessorFn: rowData => rowData.donor?.name ?? UNDEFINED_STRING_VALUE,
        // Cell: TooltipTextCell,
        defaultHideOnMobile: true,
        includeColumn: prefs.allowTrackingOfStockByDonor,
      },
      {
        accessorKey: 'sellPricePerPack',
        header: t('label.pack-sell-price'),
        columnType: ColumnType.Currency,
        defaultHideOnMobile: true,
      },
      {
        id: 'foreignCurrencySellPricePerPack',
        accessorFn: rowData => {
          if (currency) {
            return rowData.sellPricePerPack / currency.rate;
          }
        },
        header: t('label.fc-sell-price'),
        description: 'description.fc-sell-price',
        columnType: ColumnType.Currency,
        includeColumn:
          isExternalSupplier && !!store?.preferences.issueInForeignCurrency,
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'packSize',
        header: t('label.pack-size'),
        defaultHideOnMobile: true,
      },
      ...(allocateIn.type === AllocateInType.Doses
        ? ([
            {
              accessorKey: 'dosesPerUnit',
              header: unit
                ? t('label.doses-per-unit-name', {
                    unit,
                  })
                : t('label.doses-per-unit'),
              defaultHideOnMobile: true,
            },
            {
              id: 'inStorePacks',
              header: t('label.in-store-doses'),
              columnType: ColumnType.Number,
              accessorFn: rowData =>
                QuantityUtils.packsToDoses(rowData.inStorePacks, rowData),
            },
            {
              accessorKey: 'availablePacks',
              header: t('label.available-in-doses'),
              columnType: ColumnType.Number,
              accessorFn: rowData =>
                rowData.location?.onHold || rowData.stockLineOnHold
                  ? 0
                  : QuantityUtils.packsToDoses(rowData.availablePacks, rowData),
            },
            {
              accessorKey: 'dosesIssued',
              // Cell: DoseQuantityCell,
              header: t('label.doses-issued'),
              setter: (
                row: Partial<DraftStockOutLineFragment> & {
                  id: string;
                  // Extra field only in the context of this setter, based on key above
                  dosesIssued?: number;
                }
              ) => {
                const allocatedQuantity = allocate(
                  row.id,
                  row.dosesIssued ?? 0,
                  {
                    preventPartialPacks: true,
                  }
                );
                return allocatedQuantity; // return to NumberInputCell to ensure value is correct
              },
              accessorFn: rowData => getDoseQuantity(rowData),
            },
            // Can only issue in whole packs in Outbound Shipment, so we'll show the user
            {
              accessorKey: 'numberOfPacks',
              header: t('label.pack-quantity-issued'),
              // labelProps: { unit },
              defaultHideOnMobile: true,
            },
          ] as ColumnDef<DraftStockOutLineFragment>[])
        : ([
            {
              accessorKey: 'inStorePacks',
              header: t('label.in-store'),
              columnType: ColumnType.Number,
              // width: 80,
              defaultHideOnMobile: true,
            },
            {
              id: 'availablePacks',
              header: t('label.available-in-packs'),
              columnType: ColumnType.Number,
              // width: simplifiedTabletView ? 190 : 90,
              accessorFn: rowData =>
                rowData.location?.onHold || rowData.stockLineOnHold
                  ? 0
                  : rowData.availablePacks,
            },
            {
              accessorKey: 'numberOfPacks',
              header: t('label.pack-quantity-issued'),
              columnType: ColumnType.NumberInput,
              // updateFn: (value: number, row: DraftStockOutLineFragment) =>
              //   allocate(row.id, value, {
              //     allocateInType: AllocateInType.Packs,
              //   }),
            },
            {
              id: 'unitQuantity',
              header: t('label.units-issued'),
              // labelProps: { unit: pluralisedUnitName },
              accessorFn: rowData => rowData.numberOfPacks * rowData.packSize,
              // width: 90,
              defaultHideOnMobile: true,
            },
          ] as ColumnDef<DraftStockOutLineFragment>[])),
    ];
    return cols;
  }, []);

  // Display all stock lines to user, including non-allocatable ones at the bottom
  const lines = useMemo(
    () => [...draftLines, ...nonAllocatableLines],
    [draftLines, nonAllocatableLines]
  );
  // But disable the non-allocatable ones
  useEffect(() => {
    tableStore.setDisabledRows(nonAllocatableLines.map(({ id }) => id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useDisableVvmRows({ rows: lines, isVaccine: item?.isVaccine });

  // Null means we aren't using placeholder
  if (!lines.length && placeholderQuantity === null)
    return (
      <Box sx={{ margin: 'auto' }}>
        <Typography>{t('messages.no-stock-available')}</Typography>
      </Box>
    );

  let extraColumnOffset = 0;
  if (
    item?.isVaccine &&
    (prefs.manageVvmStatusForStock || prefs.sortByVvmStatusThenExpiry)
  ) {
    extraColumnOffset += 1;
  }
  if (prefs.allowTrackingOfStockByDonor) {
    extraColumnOffset += 1;
  }

  const additionalRows = [
    <PlaceholderRow
      // Only show a 0 placeholder if we have no stock lines to show
      quantity={
        placeholderQuantity === 0 && lines.length ? null : placeholderQuantity
      }
      extraColumnOffset={extraColumnOffset}
      dosesPerUnit={item?.doses}
      key="placeholder-row"
    />,
    <TotalRow
      key="total-row"
      allocatedQuantity={allocatedQuantity + (placeholderQuantity ?? 0)}
      extraColumnOffset={extraColumnOffset}
    />,
  ];

  const table = useSimpleMaterialTable<DraftStockOutLineFragment>({
    tableId: 'outbound-line-edit',
    columns: mrtColumns,
    data: lines,
    bottomToolbarContent: (
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          justifyContent: 'flex-end',
        }}
      >
        {additionalRows}
      </Box>
    ),
  });

  return (
    <Box style={{ width: '100%' }}>
      <Divider margin={10} />
      <Box
        style={{
          maxHeight: min([screen.height - 570, 325]),
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'hidden',
          overflowY: 'auto',
        }}
      >
        {tableUsabilityImprovements ? (
          <MaterialTable table={table} />
        ) : (
          <DataTable
            id="outbound-line-edit"
            columns={columns}
            data={lines}
            dense
            additionalRows={additionalRows}
            enableColumnSelection={true}
          />
        )}
      </Box>
    </Box>
  );
};
