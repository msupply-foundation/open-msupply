import React, { useMemo } from 'react';
import { MRT_Row } from 'material-react-table';
import {
  useAuthContext,
  usePreferences,
  useTranslation,
  useIntlUtils,
  Formatter,
  UNDEFINED_STRING_VALUE,
  QuantityUtils,
  ColumnDef,
  ColumnType,
  CheckCell,
  Typography,
  Tooltip,
  TextWithTooltipCell,
  CurrencyValueCell,
} from '@openmsupply-client/common';
// Need to be re-exported when Legacy cells are removed
import { NumberInputCell } from '@openmsupply-client/common/src/ui/layout/tables/material-react-table/components/NumberInputCell';
import { ExpiryDateCell } from '@openmsupply-client/common/src/ui/layout/tables/material-react-table/components/ExpiryDateCell';
import {
  CurrencyRowFragment,
  ItemVariantInfoIcon,
  VVMStatusSearchInput,
  VvmStatusFragment,
} from '@openmsupply-client/system';
import {
  canAutoAllocate,
  getDoseQuantity,
  DraftStockOutLineFragment,
  DraftItem,
  AllocateInOption,
  AllocateInType,
} from '../../../StockOut';
import { getStockOutQuantityCellId } from '../../../utils';

type AllocateFn = (
  key: string,
  value: number,
  options?: {
    allocateInType?: AllocateInType;
    preventPartialPacks?: boolean;
  }
) => number;

export const useOutboundLineEditColumns = ({
  allocate,
  item,
  currency,
  isExternalSupplier,
  allocateIn,
  setVvmStatus,
  getIsDisabled,
}: {
  getIsDisabled: (row: DraftStockOutLineFragment) => boolean;
  allocate: AllocateFn;
  item: DraftItem | null;
  currency?: CurrencyRowFragment | null;
  isExternalSupplier: boolean;
  allocateIn: AllocateInOption;
  setVvmStatus: (id: string, vvmStatus?: VvmStatusFragment | null) => void;
}) => {
  const { store } = useAuthContext();
  const t = useTranslation();
  const { getPlural } = useIntlUtils();

  const unit = Formatter.sentenceCase(item?.unitName ?? t('label.unit'));
  const pluralisedUnitName = getPlural(unit, 2);

  const prefs = usePreferences();

  const expiryThresholdDays = prefs.expiredStockIssueThreshold ?? 0;

  const columns = useMemo(() => {
    const packSize =
      allocateIn.type === AllocateInType.Packs
        ? allocateIn.packSize
        : undefined;

    const dosesView = allocateIn.type === AllocateInType.Doses;

    const cols: ColumnDef<DraftStockOutLineFragment>[] = [
      {
        id: 'canAllocate',
        header: t('description.used-in-auto-allocation'),
        Header: <></>,
        size: 30,
        defaultHideOnMobile: true,
        accessorFn: row => canAutoAllocate(row, expiryThresholdDays, packSize),
        Cell: ({ cell }) => (
          <CheckCell
            cell={cell}
            tooltipText={t('description.used-in-auto-allocation')}
          />
        ),
      },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        size: 100,
        Cell: ({ row }) => {
          return (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {row.original.batch}
              {row.original.itemVariantId && (
                <ItemVariantInfoIcon
                  includeDoseColumns={allocateIn.type === AllocateInType.Doses}
                  itemId={item?.id ?? ''}
                  itemVariantId={row.original.itemVariantId}
                />
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'expiryDate',
        header: t('label.expiry-date'),
        size: 100,
        columnType: ColumnType.Date,
        Cell: ExpiryDateCell,
      },
      {
        id: 'vvmStatus',
        header: t('label.vvm-status'),
        size: 150,
        defaultHideOnMobile: true,
        includeColumn:
          item?.isVaccine &&
          (prefs.manageVvmStatusForStock || prefs.sortByVvmStatusThenExpiry),
        Cell: ({ row }) => (
          <VVMStatusSearchInput
            onChange={vvmStatus => setVvmStatus(row.original.id, vvmStatus)}
            selected={row.original.vvmStatus ?? null}
            disabled={getIsDisabled(row.original)}
          />
        ),
      },
      {
        id: 'campaign',
        header: t('label.campaign'),
        size: 140,
        accessorFn: row => row?.campaign?.name ?? row?.program?.name ?? '',
      },
      {
        id: 'location',
        header: t('label.location'),
        size: 85,
        Cell: LocationCell,
      },
      {
        id: 'donor',
        header: t('label.donor'),
        size: 120,
        defaultHideOnMobile: true,
        includeColumn: prefs.allowTrackingOfStockByDonor,
        accessorFn: rowData => rowData.donor?.name ?? UNDEFINED_STRING_VALUE,
        Cell: TextWithTooltipCell,
      },
      {
        accessorKey: 'sellPricePerPack',
        header: t('label.pack-sell-price'),
        columnType: ColumnType.Currency,
        defaultHideOnMobile: true,
        size: 100,
      },
      {
        id: 'foreignCurrencySellPricePerPack',
        header: t('label.fc-sell-price'),
        description: t('description.fc-sell-price'),
        columnType: ColumnType.Currency,
        size: 100,
        defaultHideOnMobile: true,
        includeColumn:
          isExternalSupplier && !!store?.preferences.issueInForeignCurrency,
        Cell: props => (
          <CurrencyValueCell {...props} currencyCode={currency?.code} />
        ),
        accessorFn: rowData =>
          currency ? rowData.sellPricePerPack / currency.rate : undefined,
      },
      {
        accessorKey: 'packSize',
        header: t('label.pack-size'),
        columnType: ColumnType.Number,
        size: 80,
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'dosesPerUnit',
        header: unit
          ? t('label.doses-per-unit-name', { unit })
          : t('label.doses-per-unit'),
        size: 100,
        columnType: ColumnType.Number,
        includeColumn: dosesView,
        defaultHideOnMobile: true,
      },
      {
        id: 'inStore',
        header: dosesView ? t('label.in-store-doses') : t('label.in-store'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
        accessorFn: rowData =>
          dosesView
            ? QuantityUtils.packsToDoses(rowData.inStorePacks, rowData)
            : rowData.inStorePacks,
      },
      {
        id: 'available',
        header: dosesView
          ? t('label.available-doses')
          : t('label.available-in-packs'),
        columnType: ColumnType.Number,
        accessorFn: rowData => {
          if (rowData.location?.onHold || rowData.stockLineOnHold) return 0;
          return dosesView
            ? QuantityUtils.packsToDoses(rowData.availablePacks, rowData)
            : rowData.availablePacks;
        },
      },
      {
        id: 'issued',
        header: dosesView
          ? t('label.doses-issued')
          : t('label.pack-quantity-issued'),
        size: 100,
        accessorFn: row => {
          return dosesView ? getDoseQuantity(row) : row.numberOfPacks;
        },
        Cell: ({ row, cell }) => (
          <NumberInputCell
            id={getStockOutQuantityCellId(row.original.batch)} // Used by when adding by barcode scanner
            cell={cell}
            updateFn={value =>
              allocate(row.original.id, value, {
                preventPartialPacks: true,
                allocateInType: dosesView
                  ? AllocateInType.Doses
                  : AllocateInType.Packs,
              })
            }
            max={
              dosesView
                ? QuantityUtils.packsToDoses(
                    row.original.availablePacks,
                    row.original
                  )
                : row.original.availablePacks
            }
            disabled={getIsDisabled(row.original)}
          />
        ),
      },
      {
        // When issuing in packs, helpful to see the total unit quantity
        // In doses, it's helpful to see total number of packs
        id: 'helperIssuedQuantity',
        header: dosesView
          ? t('label.pack-quantity-issued', { unit })
          : t('label.units-issued', { unit: pluralisedUnitName }),
        accessorFn: rowData =>
          dosesView
            ? rowData.numberOfPacks
            : rowData.numberOfPacks * rowData.packSize,
        columnType: ColumnType.Number,
        size: 100,
        defaultHideOnMobile: true,
      },
      {
        id: 'volume',
        header: t('label.volume'),
        size: 100,
        columnType: ColumnType.Number,
        accessorFn: row => (row.volumePerPack ?? 0) * row.numberOfPacks,
      },
      {
        id: 'onHold',
        header: t('label.on-hold'),
        size: 70,
        defaultHideOnMobile: true,
        accessorFn: row => row.stockLineOnHold || row.location?.onHold,
        Cell: CheckCell,
      },
    ];
    return cols;
  }, [allocateIn.type]);

  return columns;
};

const LocationCell = ({ row }: { row: MRT_Row<DraftStockOutLineFragment> }) => {
  const t = useTranslation();

  const { code = '', onHold = false } = row.original.location || {};

  const onHoldText = onHold ? ` (${t('label.on-hold')})` : '';

  return (
    <Tooltip title={code} placement="bottom-start">
      <Typography
        component="div"
        sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: onHold ? 'error.main' : 'inherit',
        }}
      >
        {code + onHoldText}
      </Typography>
    </Tooltip>
  );
};
