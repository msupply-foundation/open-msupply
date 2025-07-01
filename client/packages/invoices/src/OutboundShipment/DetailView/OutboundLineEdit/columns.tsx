import React from 'react';
import {
  useColumns,
  ColumnAlign,
  ExpiryDateCell,
  CheckCell,
  LocationCell,
  NumberCell,
  ColumnDescription,
  useAuthContext,
  useCurrencyCell,
  Currencies,
  CurrencyCell,
  CellProps,
  NumberInputCell,
  usePreference,
  PreferenceKey,
  useTranslation,
  TypedTFunction,
  LocaleKey,
  useIntlUtils,
  Formatter,
  UNDEFINED_STRING_VALUE,
  TooltipTextCell,
  useSimplifiedTabletUI,
} from '@openmsupply-client/common';
import {
  CurrencyRowFragment,
  ItemVariantInfoIcon,
} from '@openmsupply-client/system';
import { getStockOutQuantityCellId } from '../../../utils';
import {
  canAutoAllocate,
  getDoseQuantity,
  packsToDoses,
  DraftStockOutLineFragment,
  DraftItem,
  AllocateInOption,
  AllocateInType,
} from '../../../StockOut';
import { useCampaigns } from '@openmsupply-client/system/src/Manage/Campaigns/api';

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
}: {
  allocate: AllocateFn;
  item: DraftItem | null;
  currency?: CurrencyRowFragment | null;
  isExternalSupplier: boolean;
  allocateIn: AllocateInOption;
}) => {
  const { store } = useAuthContext();
  const t = useTranslation();
  const { getPlural } = useIntlUtils();

  const {
    query: { data: campaigns },
  } = useCampaigns();
  const simplifiedTabletView = useSimplifiedTabletUI();

  const unit = Formatter.sentenceCase(item?.unitName ?? t('label.unit'));
  const pluralisedUnitName = getPlural(unit, 2);

  const { data: prefs } = usePreference(
    PreferenceKey.SortByVvmStatusThenExpiry,
    PreferenceKey.ManageVvmStatusForStock,
    PreferenceKey.AllowTrackingOfStockByDonor
  );

  const packSize =
    allocateIn.type === AllocateInType.Packs ? allocateIn.packSize : undefined;

  const ForeignCurrencyCell = useCurrencyCell<DraftStockOutLineFragment>(
    currency?.code as Currencies
  );

  const columnDefinitions: ColumnDescription<DraftStockOutLineFragment>[] = [
    {
      label: '',
      key: 'canAllocate',
      Cell: CheckCell,
      cellProps: {
        tooltipText: t('description.used-in-auto-allocation'),
      },
      accessor: ({ rowData }) => canAutoAllocate(rowData, packSize),
      align: ColumnAlign.Center,
      width: 35,
      defaultHideOnMobile: true,
    },
    [
      'batch',
      {
        accessor: ({ rowData }) => rowData.batch,
        Cell: getBatchWithVariantCell(
          item?.id ?? '',
          allocateIn.type === AllocateInType.Doses
        ),
        width: simplifiedTabletView ? 190 : 100,
      },
    ],
    [
      'expiryDate',
      {
        Cell: ExpiryDateCell,
        width: 100,
      },
    ],
  ];
  // If we have use VVM status, we need to show the VVM status column
  if (
    (prefs?.manageVvmStatusForStock || prefs?.sortByVvmStatusThenExpiry) &&
    item?.isVaccine
  ) {
    columnDefinitions.push({
      key: 'vvmStatus',
      label: 'label.vvm-status',
      accessor: ({ rowData }) => {
        if (!rowData.vvmStatus) return '';
        // TODO: Show unusable VVM status somehow?
        return `${rowData.vvmStatus?.description} (${rowData.vvmStatus?.level})`;
      },
      width: 85,
      Cell: TooltipTextCell,
      defaultHideOnMobile: true,
    });
  }

  // Only show campaigns column if some are defined -- in time we should have a
  // store pref for this
  if (campaigns?.totalCount ?? 0 > 0)
    columnDefinitions.push({
      key: 'campaign',
      label: 'label.campaign',
      accessor: ({ rowData }) => rowData?.campaign?.name,
    });

  columnDefinitions.push([
    'location',
    {
      accessor: ({ rowData }) => rowData.location?.code,
      width: 85,
      Cell: LocationCell,
      defaultHideOnMobile: true,
    },
  ]);
  if (prefs?.allowTrackingOfStockByDonor) {
    columnDefinitions.push({
      key: 'donor',
      label: 'label.donor',
      accessor: ({ rowData }) => rowData.donor?.name ?? UNDEFINED_STRING_VALUE,
      Cell: TooltipTextCell,
      width: 100,
      defaultHideOnMobile: true,
    });
  }

  columnDefinitions.push([
    'sellPricePerPack',
    {
      Cell: CurrencyCell,
      width: 85,
      defaultHideOnMobile: true,
    },
  ]);

  if (isExternalSupplier && !!store?.preferences.issueInForeignCurrency) {
    columnDefinitions.push({
      key: 'foreignCurrencySellPricePerPack',
      label: 'label.fc-sell-price',
      description: 'description.fc-sell-price',
      width: 85,
      align: ColumnAlign.Right,
      Cell: ForeignCurrencyCell,
      accessor: ({ rowData }) => {
        if (currency) {
          return rowData.sellPricePerPack / currency.rate;
        }
      },
      defaultHideOnMobile: true,
    });
  }

  columnDefinitions.push([
    'packSize',
    { width: 90, defaultHideOnMobile: true },
  ]);

  if (allocateIn.type === AllocateInType.Doses) {
    columnDefinitions.push(...getAllocateInDosesColumns(t, allocate, unit));
  } else {
    columnDefinitions.push(
      ...getAllocateInUnitsColumns(
        allocate,
        pluralisedUnitName,
        simplifiedTabletView
      )
    );
  }

  columnDefinitions.push({
    label: 'label.on-hold',
    key: 'onHold',
    Cell: CheckCell,
    accessor: ({ rowData }) =>
      rowData.stockLineOnHold || rowData.location?.onHold,
    align: ColumnAlign.Center,
    width: 70,
    defaultHideOnMobile: true,
  });

  const columns = useColumns<DraftStockOutLineFragment>(columnDefinitions, {}, [
    allocate,
  ]);

  return columns;
};

const PackQuantityCell = (props: CellProps<DraftStockOutLineFragment>) => (
  <NumberInputCell
    {...props}
    max={props.rowData.availablePacks}
    id={getStockOutQuantityCellId(props.rowData.batch)} // Used by when adding by barcode scanner
    decimalLimit={2}
    min={0}
  />
);

const getAllocateInUnitsColumns = (
  allocate: AllocateFn,
  pluralisedUnitName: string,
  simplifiedTabletView: boolean
): ColumnDescription<DraftStockOutLineFragment>[] => [
  {
    Cell: NumberCell,
    label: 'label.in-store',
    key: 'totalNumberOfPacks',
    align: ColumnAlign.Right,
    width: 80,
    accessor: ({ rowData }) => rowData.inStorePacks,
    defaultHideOnMobile: true,
  },
  {
    Cell: NumberCell,
    label: 'label.available-packs',
    key: 'availablePacks',
    align: ColumnAlign.Right,
    width: simplifiedTabletView ? 190 : 90,
    accessor: ({ rowData }) =>
      rowData.location?.onHold || rowData.stockLineOnHold
        ? 0
        : rowData.availablePacks,
  },
  [
    'numberOfPacks',
    {
      Cell: PackQuantityCell,
      width: simplifiedTabletView ? 190 : 100,
      label: 'label.pack-quantity-issued',
      setter: ({ id, numberOfPacks }) =>
        // Pack QTY column, so should issue in packs, even though in unit lens
        allocate(id, numberOfPacks ?? 0, {
          allocateInType: AllocateInType.Packs,
        }),
      align: ColumnAlign.Left,
    },
  ],
  [
    'unitQuantity',
    {
      label: 'label.units-issued',
      labelProps: { unit: pluralisedUnitName },
      accessor: ({ rowData }) => rowData.numberOfPacks * rowData.packSize,
      width: 90,
      defaultHideOnMobile: true,
    },
  ],
];

const DoseQuantityCell = (props: CellProps<DraftStockOutLineFragment>) => (
  <NumberInputCell
    {...props}
    max={packsToDoses(props.rowData.availablePacks, props.rowData)}
    id={getStockOutQuantityCellId(props.rowData.batch)} // Used by when adding by barcode scanner
    decimalLimit={0}
    min={0}
    // bit longer debounce, as we might overwrite value to whole number of packs
    debounce={750}
  />
);

const getAllocateInDosesColumns = (
  t: TypedTFunction<LocaleKey>,
  allocate: AllocateFn,
  unit: string
): ColumnDescription<DraftStockOutLineFragment>[] => {
  return [
    {
      key: 'dosesPerUnit',
      label: unit
        ? t('label.doses-per-unit-name', {
            unit,
          })
        : 'label.doses-per-unit',
      width: 80,
      align: ColumnAlign.Right,
      accessor: ({ rowData }) =>
        rowData?.itemVariant?.dosesPerUnit ?? rowData.defaultDosesPerUnit,
      defaultHideOnMobile: true,
    },
    {
      label: 'label.in-store-doses',
      Cell: NumberCell,
      key: 'inStorePacks',
      align: ColumnAlign.Right,
      width: 80,
      accessor: ({ rowData }) => packsToDoses(rowData.inStorePacks, rowData),
      defaultHideOnMobile: true,
    },
    {
      label: 'label.available-doses',
      Cell: NumberCell,
      key: 'availablePacks',
      align: ColumnAlign.Right,
      width: 90,
      accessor: ({ rowData }) =>
        rowData.location?.onHold || rowData.stockLineOnHold
          ? 0
          : packsToDoses(rowData.availablePacks, rowData),
    },
    {
      key: 'dosesIssued',
      Cell: DoseQuantityCell,
      width: 100,
      label: 'label.doses-issued',
      setter: (
        row: Partial<DraftStockOutLineFragment> & {
          id: string;
          // Extra field only in the context of this setter, based on key above
          dosesIssued?: number;
        }
      ) => {
        const allocatedQuantity = allocate(row.id, row.dosesIssued ?? 0, {
          preventPartialPacks: true,
        });
        return allocatedQuantity; // return to NumberInputCell to ensure value is correct
      },
      accessor: ({ rowData }) => getDoseQuantity(rowData),
    },
    // Can only issue in whole packs in Outbound Shipment, so we'll show the user
    [
      'numberOfPacks',
      {
        label: 'label.pack-quantity-issued',
        labelProps: { unit },
        accessor: ({ rowData }) => rowData.numberOfPacks,
        width: 90,
        defaultHideOnMobile: true,
      },
    ],
  ];
};

interface BatchWithVariantCellProps {
  rowData: DraftStockOutLineFragment;
}

const getBatchWithVariantCell =
  (itemId: string, includeDoseColumns: boolean) =>
  ({ rowData }: BatchWithVariantCellProps) => {
    return (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {rowData.batch}
        {rowData.itemVariant && (
          <ItemVariantInfoIcon
            includeDoseColumns={includeDoseColumns}
            itemId={itemId}
            itemVariantId={rowData.itemVariant.id}
          />
        )}
      </div>
    );
  };
