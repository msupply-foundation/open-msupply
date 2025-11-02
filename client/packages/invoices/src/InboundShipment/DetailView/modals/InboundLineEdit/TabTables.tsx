import React, { useMemo } from 'react';
import {
  DataTable,
  useColumns,
  CurrencyInputCell,
  ColumnDescription,
  useTheme,
  QueryParamsProvider,
  createQueryParamsStore,
  getColumnLookupWithOverrides,
  ColumnAlign,
  Currencies,
  useCurrencyCell,
  useAuthContext,
  useTranslation,
  usePreferences,
  Formatter,
  useIntlUtils,
  getDosesPerUnitColumn,
  useFormatNumber,
  NumUtils,
  IconButton,
  DeleteIcon,
  ColumnDef,
  Box,
  Typography,
  useSimpleMaterialTable,
  MaterialTable,
  ColumnType,
  DateUtils,
  useFormatDateTime,
} from '@openmsupply-client/common';
// Need to be re-exported when Legacy cells are removed
import { TextInputCell } from '@openmsupply-client/common/src/ui/layout/tables/material-react-table/components/TextInputCell';
import { ExpiryDateInputCell } from '@openmsupply-client/common/src/ui/layout/tables/material-react-table/components/ExpiryDateInputCell';
import { NumberInputCell } from '@openmsupply-client/common/src/ui/layout/tables/material-react-table/components/NumberInputCell';
import { ItemVariantCell } from '@openmsupply-client/common/src/ui/layout/tables/material-react-table/components/ItemVariantCell';
import { DraftInboundLine } from '../../../../types';
import {
  CurrencyRowFragment,
  getCampaignOrProgramColumn,
  getDonorColumn,
  getLocationInputColumn,
  getVolumePerPackFromVariant,
  ItemRowFragment,
  ItemVariantFragment,
  LocationRowFragment,
  PackSizeEntryCell,
  VVMStatusSearchInput,
} from '@openmsupply-client/system';
import { PatchDraftLineInput } from '../../../api';

interface TableProps {
  lines: DraftInboundLine[];
  updateDraftLine: (patch: PatchDraftLineInput) => void;
  isDisabled?: boolean;
  currency?: CurrencyRowFragment | null;
  isExternalSupplier?: boolean;
  hasItemVariantsEnabled?: boolean;
  hasVvmStatusesEnabled?: boolean;
  item?: ItemRowFragment | null;
  setPackRoundingMessage?: (value: React.SetStateAction<string>) => void;
  restrictedToLocationTypeId?: string | null;
}

interface QuantityTableProps extends TableProps {
  removeDraftLine: (id: string) => void;
}

export const QuantityTableComponent = ({
  lines,
  updateDraftLine,
  removeDraftLine,
  isDisabled = false,
  hasItemVariantsEnabled,
  hasVvmStatusesEnabled,
  item,
  setPackRoundingMessage,
}: QuantityTableProps) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();
  const { format } = useFormatNumber();
  const { manageVaccinesInDoses } = usePreferences();
  const displayInDoses = manageVaccinesInDoses && !!item?.isVaccine;
  const unitName = Formatter.sentenceCase(
    item?.unitName ? item.unitName : t('label.unit')
  );
  const pluralisedUnitName = getPlural(unitName, 2);
  const { localisedDate } = useFormatDateTime();

  const columns = useMemo(() => {
    const cols: ColumnDef<DraftInboundLine>[] = [
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        size: 100,
        Cell: ({ row, cell }) => (
          <TextInputCell
            cell={cell}
            updateFn={(value: string) => {
              updateDraftLine({ batch: value, id: row.original.id });
            }}
            autoFocus={row.index === 0}
          />
        ),
        // TODO: Mui Autocomplete
        // autocompleteProvider: data => `inboundshipment${data.item.id}`,
      },
      {
        accessorKey: 'expiryDate',
        header: t('label.expiry-date'),
        size: 150,
        columnType: ColumnType.Date,
        Cell: ({ row, cell }) => (
          <ExpiryDateInputCell
            cell={cell}
            updateFn={(value: Date | null) => {
              const date = value ? localisedDate(value) : null;
              updateDraftLine({ expiryDate: date, id: row.original.id });
            }}
            isDisabled={isDisabled}
          />
        ),
      },
      {
        accessorKey: 'itemVariant',
        header: t('label.item-variant'),
        size: 150,
        accessorFn: row => row.itemVariant?.id || '',
        Cell: ({ row, cell }) => (
          <ItemVariantCell
            cell={cell}
            updateFn={(value: ItemVariantFragment | null) => {
              updateDraftLine({
                itemVariant: value,
                id: row.original.id,
              });
            }}
            itemId={row.original.item.id}
          />
        ),
        includeColumn: hasItemVariantsEnabled,
      },
      {
        id: 'itemDoses',
        header: t('label.doses-per-unit'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
        includeColumn: displayInDoses,
        accessorFn: row => (row.item.isVaccine ? row.item.doses : undefined),
      },
      {
        id: 'vvmStatus',
        header: t('label.vvm-status'),
        size: 150,
        accessorFn: row => row.vvmStatus || '',
        Cell: ({
          row: {
            original: { id, vvmStatus, stockLine },
          },
        }) => (
          <VVMStatusSearchInput
            disabled={isDisabled}
            selected={vvmStatus ?? null}
            onChange={vvmStatus => updateDraftLine({ id, vvmStatus })}
            useDefault={!stockLine}
          />
        ),
        includeColumn: hasVvmStatusesEnabled && item?.isVaccine,
      },
      {
        accessorKey: 'shippedPackSize',
        header: t('label.shipped-pack-size'),
        size: 100,
        Cell: ({ row, cell }) => (
          <NumberInputCell
            cell={cell}
            updateFn={(value: number) => {
              updateDraftLine({ shippedPackSize: value, id: row.original.id });
            }}
            disabled={isDisabled}
          />
        ),
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'shippedNumberOfPacks',
        header: t('label.shipped-number-of-packs'),
        size: 100,
        Cell: ({ row, cell }) => (
          <NumberInputCell
            cell={cell}
            updateFn={(value: number) => {
              updateDraftLine({
                shippedNumberOfPacks: value,
                id: row.original.id,
              });
            }}
            disabled={isDisabled}
            min={1}
          />
        ),
      },
      {
        accessorKey: 'packSize',
        header: t('label.received-pack-size'),
        size: 100,
        Cell: ({ row, cell }) => (
          <NumberInputCell
            cell={cell}
            updateFn={(value: number) => {
              const line = row.original;
              const item = row.original.item;
              const shouldClearSellPrice =
                item?.defaultPackSize !== line.packSize &&
                item?.itemStoreProperties?.defaultSellPricePerPack ===
                  line.sellPricePerPack;

              updateDraftLine({
                volumePerPack: getVolumePerPackFromVariant(line) ?? 0,
                sellPricePerPack: shouldClearSellPrice
                  ? 0
                  : line.sellPricePerPack,
                packSize: value,
                id: row.original.id,
              });
            }}
            disabled={isDisabled}
            min={1}
          />
        ),
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'numberOfPacks',
        header: t('label.packs-received'),
        size: 100,
        Cell: ({ row, cell }) => (
          <NumberInputCell
            cell={cell}
            updateFn={(value: number) => {
              const { packSize } = row.original;
              if (packSize !== undefined) {
                const packToUnits = packSize * value;
                setPackRoundingMessage?.('');
                updateDraftLine({
                  unitsPerPack: packToUnits,
                  id: row.original.id,
                  numberOfPacks: value,
                });
              }
            }}
            disabled={isDisabled}
            min={0}
          />
        ),
      },
      {
        accessorKey: 'doseQuantity',
        header: t('label.doses-received'),
        size: 100,
        includeColumn: displayInDoses,
        accessorFn: row => {
          const total = row.numberOfPacks * row.packSize;
          return format(total * row.item.doses);
        },
      },
      {
        accessorKey: 'unitsPerPack',
        header: t('label.units-received', {
          unit: pluralisedUnitName,
        }),
        size: 100,
        defaultHideOnMobile: true,
        accessorFn: row => {
          return row.numberOfPacks * row.packSize;
        },
        Cell: ({ row, cell }) => (
          <NumberInputCell
            cell={cell}
            updateFn={(value: number) => {
              const { packSize, unitsPerPack } = row.original;
              if (packSize !== undefined && unitsPerPack !== undefined) {
                const unitToPacks = value / packSize;
                const roundedPacks = Math.ceil(unitToPacks);
                const actualUnits = roundedPacks * packSize;
                if (roundedPacks === unitToPacks || roundedPacks === 0) {
                  setPackRoundingMessage?.('');
                } else {
                  setPackRoundingMessage?.(
                    t('messages.under-allocated', {
                      receivedQuantity: format(NumUtils.round(value, 2)), // round the display value to 2dp
                      quantity: format(actualUnits),
                    })
                  );
                }
                updateDraftLine({
                  unitsPerPack: actualUnits,
                  numberOfPacks: roundedPacks,
                  id: row.original.id,
                });
                return actualUnits;
              }
            }}
            disabled={isDisabled}
            min={0}
          />
        ),
      },
      {
        accessorKey: 'volumePerPack',
        header: t('label.volume-per-pack'),
        size: 100,
        Cell: ({ row, cell }) => (
          <NumberInputCell
            cell={cell}
            updateFn={(value: number) => {
              updateDraftLine({ volumePerPack: value, id: row.original.id });
            }}
            disabled={isDisabled}
            decimalLimit={10}
          />
        ),
      },
      {
        id: 'delete',
        header: '',
        size: 50,
        Cell: ({ row }) => (
          <IconButton
            label={t('button.delete')}
            onClick={() => removeDraftLine(row.original.id)}
            icon={<DeleteIcon fontSize="small" />}
          />
        ),
      },
    ];
    return cols;
  }, []);

  const table = useSimpleMaterialTable<DraftInboundLine>({
    tableId: 'inbound-line-quantity',
    columns,
    data: lines,
    // getIsRestrictedRow: row => getIsDisabled(row),
  });

  return <MaterialTable table={table} />;
};

export const QuantityTable = React.memo(QuantityTableComponent);

// export const PricingTableComponent = ({
//   lines,
//   updateDraftLine,
//   isDisabled = false,
//   currency,
//   isExternalSupplier,
// }: TableProps) => {
//   const { store } = useAuthContext();

//   const CurrencyCell = useCurrencyCell<DraftInboundLine>(
//     currency?.code as Currencies
//   );

//   const columnDefinitions: ColumnDescription<DraftInboundLine>[] = [
//     [
//       'batch',
//       {
//         accessor: ({ rowData }) => rowData.batch || '',
//       },
//     ],
//   ];

//   columnDefinitions.push(
//     getColumnLookupWithOverrides('packSize', {
//       label: 'label.pack-size',
//     }),
//     [
//       'numberOfPacks',
//       {
//         width: 100,
//       },
//     ],
//     [
//       'costPricePerPack',
//       {
//         Cell: CurrencyInputCell,
//         width: 100,
//         setter: updateDraftLine,
//       },
//     ]
//   );

//   if (isExternalSupplier && !!store?.preferences.issueInForeignCurrency) {
//     columnDefinitions.push({
//       key: 'foreignCurrencyCostPricePerPack',
//       label: 'label.fc-cost-price',
//       description: 'description.fc-cost-price',
//       width: 100,
//       align: ColumnAlign.Right,
//       Cell: CurrencyCell,
//       accessor: ({ rowData }) => {
//         if (currency) {
//           return rowData.costPricePerPack / currency.rate;
//         }
//       },
//     });
//   }

//   columnDefinitions.push([
//     'sellPricePerPack',
//     {
//       Cell: CurrencyInputCell,
//       width: 100,
//       setter: updateDraftLine,
//     },
//   ]);

//   if (isExternalSupplier && !!store?.preferences.issueInForeignCurrency) {
//     columnDefinitions.push({
//       key: 'foreignCurrencySellPricePerPack',
//       label: 'label.fc-sell-price',
//       description: 'description.fc-sell-price',
//       width: 100,
//       align: ColumnAlign.Right,
//       Cell: CurrencyCell,
//       accessor: ({ rowData }) => {
//         if (currency) {
//           return rowData.sellPricePerPack / currency.rate;
//         }
//       },
//     });
//   }

//   columnDefinitions.push([
//     'lineTotal',
//     {
//       accessor: ({ rowData }) =>
//         rowData.numberOfPacks * rowData.costPricePerPack,
//     },
//   ]);

//   if (isExternalSupplier && !!store?.preferences.issueInForeignCurrency) {
//     columnDefinitions.push({
//       key: 'foreignCurrencyLineTotal',
//       label: 'label.fc-line-total',
//       description: 'description.fc-line-total',
//       width: 100,
//       Cell: CurrencyCell,
//       align: ColumnAlign.Right,
//       accessor: ({ rowData }) => {
//         if (currency) {
//           return (
//             (rowData.numberOfPacks * rowData.costPricePerPack) / currency.rate
//           );
//         }
//       },
//     });
//   }

//   const columns = useColumns<DraftInboundLine>(columnDefinitions, {}, [
//     updateDraftLine,
//     lines,
//   ]);

//   return (
//     <DataTable
//       id="inbound-line-pricing"
//       isDisabled={isDisabled}
//       columns={columns}
//       data={lines}
//       dense
//     />
//   );
// };

// export const PricingTable = React.memo(PricingTableComponent);

// export const LocationTableComponent = ({
//   lines,
//   updateDraftLine,
//   isDisabled,
//   restrictedToLocationTypeId,
// }: TableProps) => {
//   const { allowTrackingOfStockByDonor } = usePreferences();

//   const columnDescriptions: ColumnDescription<DraftInboundLine>[] = [
//     [
//       'batch',
//       {
//         accessor: ({ rowData }) => rowData.batch || '',
//       },
//     ],
//     [
//       'location',
//       {
//         ...getLocationInputColumn(restrictedToLocationTypeId),
//         setter: updateDraftLine,
//         width: 530,
//         cellProps: {
//           getVolumeRequired: (rowData: DraftInboundLine) =>
//             rowData.volumePerPack * rowData.numberOfPacks,
//         },
//       },
//     ],
//     [
//       'note',
//       {
//         Cell: TextInputCell,
//         setter: patch => {
//           const note = patch.note === '' ? null : patch.note;
//           updateDraftLine({ ...patch, note });
//         },
//         accessor: ({ rowData }) => rowData.note ?? '',
//       },
//     ],
//   ];

//   if (allowTrackingOfStockByDonor) {
//     columnDescriptions.push([
//       getDonorColumn((id, donor) => updateDraftLine({ id, donor })),
//       { accessor: ({ rowData }) => rowData.donor?.id },
//     ] as ColumnDescription<DraftInboundLine>);
//   }

//   columnDescriptions.push(
//     getCampaignOrProgramColumn(patch => updateDraftLine(patch))
//   );

//   const columns = useColumns(columnDescriptions, {}, [updateDraftLine, lines]);

//   return (
//     <QueryParamsProvider
//       createStore={createQueryParamsStore<LocationRowFragment>({
//         initialSortBy: { key: 'name' },
//       })}
//     >
//       <DataTable
//         id="inbound-line-location"
//         columns={columns}
//         data={lines}
//         dense
//         isDisabled={isDisabled}
//       />
//     </QueryParamsProvider>
//   );
// };

// export const LocationTable = React.memo(LocationTableComponent);
