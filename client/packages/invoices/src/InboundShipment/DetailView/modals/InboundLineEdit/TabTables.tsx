import React, { useMemo, useRef } from 'react';
import {
  useAuthContext,
  useTranslation,
  usePreferences,
  Formatter,
  useIntlUtils,
  useFormatNumber,
  NumUtils,
  IconButton,
  DeleteIcon,
  ColumnDef,
  useSimpleMaterialTable,
  MaterialTable,
  Box,
  ColumnType,
  DateUtils,
  ExpiryDateInput,
  DateTimePickerInput,
  TextInputCell,
  NumberInputCell,
  CurrencyInputCell,
  CardList,
  StockIcon,
  InvoiceIcon,
  SlidersIcon,
  EditIcon,
} from '@openmsupply-client/common';
import { DraftInboundLine } from '../../../../types';
import {
  CampaignOrProgramCell,
  CurrencyRowFragment,
  DonorSearchInput,
  getVolumePerPackFromVariant,
  ItemRowFragment,
  ItemVariantInput,
  LocationRowFragment,
  LocationSearchInput,
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

export const QuantityTable = ({
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
  const formatRef = useRef(format);
  formatRef.current = format;
  const { manageVaccinesInDoses } = usePreferences();

  const displayInDoses = manageVaccinesInDoses && !!item?.isVaccine;
  const unitName = Formatter.sentenceCase(
    item?.unitName ? item.unitName : t('label.unit')
  );
  const pluralisedUnitName = getPlural(unitName, 2);

  const columns = useMemo(() => {
    const cols: ColumnDef<DraftInboundLine>[] = [
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        size: 100,
        Cell: ({ row, cell }) => (
          <TextInputCell
            cell={cell}
            updateFn={(batch: string) =>
              updateDraftLine({ id: row.original.id, batch })
            }
            autoFocus={row.index === 0}
          />
        ),
      },
      {
        accessorKey: 'expiryDate',
        header: t('label.expiry-date'),
        size: 150,
        columnType: ColumnType.Date,
        accessorFn: row => DateUtils.getDateOrNull(row.expiryDate),
        Cell: ({ cell, row }) => {
          const value = cell.getValue<Date | null>();
          return (
            <ExpiryDateInput
              value={value}
              disabled={isDisabled}
              onChange={date =>
                updateDraftLine({
                  id: row.original.id,
                  expiryDate: Formatter.naiveDate(date),
                })
              }
            />
          );
        },
      },
      {
        id: 'manufactureDate',
        header: t('label.manufacture-date'),
        size: 150,
        columnType: ColumnType.Date,
        accessorFn: row => DateUtils.getDateOrNull(row.manufactureDate),
        Cell: ({ cell, row }) => {
          const value = cell.getValue<Date | null>();
          return (
            <DateTimePickerInput
              value={value}
              disabled={isDisabled}
              onChange={date =>
                updateDraftLine({
                  id: row.original.id,
                  manufactureDate: date ? Formatter.naiveDate(date) : null,
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
            original: { id, packSize, itemVariant, item },
          },
        }) => (
          <ItemVariantInput
            disabled={isDisabled}
            selectedId={itemVariant?.id}
            itemId={item.id}
            width="100%"
            onChange={itemVariant =>
              updateDraftLine({
                id,
                itemVariantId: itemVariant?.id,
                itemVariant,
                volumePerPack: getVolumePerPackFromVariant({
                  packSize,
                  itemVariant,
                }),
              })
            }
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
        size: 120,
        Cell: ({ row, cell }) => (
          <NumberInputCell
            cell={cell}
            updateFn={(value: number) => {
              updateDraftLine({ shippedPackSize: value, id: row.original.id });
            }}
            disabled={isDisabled}
            min={1}
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
            min={0}
          />
        ),
      },
      {
        accessorKey: 'packSize',
        header: t('label.received-pack-size'),
        size: 120,
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
                volumePerPack:
                  getVolumePerPackFromVariant({
                    itemVariant: line.itemVariant,
                    packSize: value,
                  }) ?? 0,
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
                  receivedNumberOfUnits: packToUnits,
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
        accessorKey: 'receivedNumberOfUnits',
        header: t('label.units-received', {
          unit: pluralisedUnitName,
        }),
        size: 120,
        defaultHideOnMobile: true,
        accessorFn: row => {
          return row.numberOfPacks * row.packSize;
        },
        Cell: ({ row, cell }) => (
          <NumberInputCell
            cell={cell}
            debounceTime={500}
            updateFn={(value: number) => {
              const { packSize } = row.original;
              if (packSize !== undefined) {
                const unitToPacks = value / packSize;
                const roundedPacks = Math.ceil(unitToPacks);
                const actualUnits = roundedPacks * packSize;
                if (roundedPacks === unitToPacks || roundedPacks === 0) {
                  setPackRoundingMessage?.('');
                } else {
                  setPackRoundingMessage?.(
                    t('messages.under-allocated', {
                      receivedQuantity: formatRef.current(NumUtils.round(value, 2)), // round the display value to 2dp
                      quantity: formatRef.current(actualUnits),
                    })
                  );
                }
                updateDraftLine({
                  receivedNumberOfUnits: actualUnits,
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
        accessorKey: 'doseQuantity',
        header: t('label.doses-received'),
        size: 100,
        includeColumn: displayInDoses,
        accessorFn: row => {
          const total = row.numberOfPacks * row.packSize;
          return formatRef.current(total * row.item.doses);
        },
      },
      {
        accessorKey: 'volumePerPack',
        header: t('label.volume-per-pack'),
        size: 140,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isDisabled,
    updateDraftLine,
    setPackRoundingMessage,
    unitName,
    pluralisedUnitName,
    displayInDoses,
    hasItemVariantsEnabled,
    hasVvmStatusesEnabled,
    item?.isVaccine,
    removeDraftLine,
  ]);

  const table = useSimpleMaterialTable<DraftInboundLine>({
    tableId: 'inbound-line-quantity',
    columns,
    data: lines,
    getIsRestrictedRow: isDisabled ? () => true : undefined,
  });

  return <MaterialTable table={table} />;
};

interface InboundLineEditTableProps extends TableProps {
  removeDraftLine: (id: string) => void;
  lastCardRef?: React.RefObject<HTMLDivElement>;
}

export const InboundLineEditTable = ({
  lines,
  updateDraftLine,
  removeDraftLine,
  isDisabled = false,
  currency,
  isExternalSupplier,
  hasItemVariantsEnabled,
  hasVvmStatusesEnabled,
  item,
  setPackRoundingMessage,
  restrictedToLocationTypeId,
  lastCardRef,
}: InboundLineEditTableProps) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();
  const { format } = useFormatNumber();
  const formatRef = useRef(format);
  formatRef.current = format;
  const { store } = useAuthContext();
  const { manageVaccinesInDoses, allowTrackingOfStockByDonor } =
    usePreferences();

  const displayInDoses = manageVaccinesInDoses && !!item?.isVaccine;
  const unitName = Formatter.sentenceCase(
    item?.unitName ? item.unitName : t('label.unit')
  );
  const pluralisedUnitName = getPlural(unitName, 2);

  const columns = useMemo(() => {
    const cols: ColumnDef<DraftInboundLine>[] = [
      // --- General columns ---
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        size: 100,
        columnGroup: 'general',
        cardSummary: row =>
          `${t('label.batch')} ${row.batch || ''}`,
        Cell: ({ row, cell }) => (
          <TextInputCell
            cell={cell}
            updateFn={(batch: string) =>
              updateDraftLine({ id: row.original.id, batch })
            }
            autoFocus={row.index === 0}
          />
        ),
      },
      {
        accessorKey: 'expiryDate',
        header: t('label.expiry-date'),
        size: 150,
        columnType: ColumnType.Date,
        columnGroup: 'general',
        accessorFn: row => DateUtils.getDateOrNull(row.expiryDate),
        Cell: ({ cell, row }) => {
          const value = cell.getValue<Date | null>();
          return (
            <ExpiryDateInput
              value={value}
              disabled={isDisabled}
              onChange={date =>
                updateDraftLine({
                  id: row.original.id,
                  expiryDate: Formatter.naiveDate(date),
                })
              }
            />
          );
        },
      },
      // --- Quantities columns ---
      {
        id: 'itemVariant',
        header: t('label.item-variant'),
        accessorFn: row => row.itemVariant?.id || '',
        size: 150,
        columnGroup: 'quantities',
        Cell: ({
          row: {
            original: { id, packSize, itemVariant, item },
          },
        }) => (
          <ItemVariantInput
            disabled={isDisabled}
            selectedId={itemVariant?.id}
            itemId={item.id}
            width="100%"
            onChange={itemVariant =>
              updateDraftLine({
                id,
                itemVariantId: itemVariant?.id,
                itemVariant,
                volumePerPack: getVolumePerPackFromVariant({
                  packSize,
                  itemVariant,
                }),
              })
            }
          />
        ),
        includeColumn: hasItemVariantsEnabled,
      },
      {
        id: 'itemDoses',
        header: t('label.doses-per-unit'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
        columnGroup: 'quantities',
        includeColumn: displayInDoses,
        accessorFn: row => (row.item.isVaccine ? row.item.doses : undefined),
      },
      {
        id: 'vvmStatus',
        header: t('label.vvm-status'),
        size: 150,
        columnGroup: 'quantities',
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
        size: 120,
        columnGroup: 'quantities',
        Cell: ({ row, cell }) => (
          <NumberInputCell
            cell={cell}
            updateFn={(value: number) => {
              updateDraftLine({ shippedPackSize: value, id: row.original.id });
            }}
            disabled={isDisabled}
            min={1}
          />
        ),
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'shippedNumberOfPacks',
        header: t('label.shipped-number-of-packs'),
        size: 100,
        columnGroup: 'quantities',
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
            min={0}
          />
        ),
      },
      {
        accessorKey: 'packSize',
        header: t('label.received-pack-size'),
        size: 120,
        columnGroup: 'quantities',
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
                volumePerPack:
                  getVolumePerPackFromVariant({
                    itemVariant: line.itemVariant,
                    packSize: value,
                  }) ?? 0,
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
        columnGroup: 'quantities',
        cardSummary: row =>
          `${row.numberOfPacks} ${t('label.packs-received')}`,
        Cell: ({ row, cell }) => (
          <NumberInputCell
            cell={cell}
            updateFn={(value: number) => {
              const { packSize } = row.original;
              if (packSize !== undefined) {
                const packToUnits = packSize * value;
                setPackRoundingMessage?.('');
                updateDraftLine({
                  receivedNumberOfUnits: packToUnits,
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
        accessorKey: 'receivedNumberOfUnits',
        header: t('label.units-received', {
          unit: pluralisedUnitName,
        }),
        size: 120,
        defaultHideOnMobile: true,
        columnGroup: 'quantities',
        accessorFn: row => {
          return row.numberOfPacks * row.packSize;
        },
        Cell: ({ row, cell }) => (
          <NumberInputCell
            cell={cell}
            updateFn={(value: number) => {
              const { packSize } = row.original;
              if (packSize !== undefined) {
                const unitToPacks = value / packSize;
                const roundedPacks = Math.ceil(unitToPacks);
                const actualUnits = roundedPacks * packSize;
                if (roundedPacks === unitToPacks || roundedPacks === 0) {
                  setPackRoundingMessage?.('');
                } else {
                  setPackRoundingMessage?.(
                    t('messages.under-allocated', {
                      receivedQuantity: formatRef.current(NumUtils.round(value, 2)),
                      quantity: formatRef.current(actualUnits),
                    })
                  );
                }
                updateDraftLine({
                  receivedNumberOfUnits: actualUnits,
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
        accessorKey: 'doseQuantity',
        header: t('label.doses-received'),
        size: 100,
        columnGroup: 'quantities',
        includeColumn: displayInDoses,
        accessorFn: row => {
          const total = row.numberOfPacks * row.packSize;
          return formatRef.current(total * row.item.doses);
        },
      },
      {
        accessorKey: 'volumePerPack',
        header: t('label.volume-per-pack'),
        size: 140,
        columnGroup: 'quantities',
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
      // --- Pricing columns ---
      {
        accessorKey: 'costPricePerPack',
        header: t('label.pack-cost-price'),
        columnGroup: 'pricing',
        Cell: ({ cell, row }) => (
          <CurrencyInputCell
            cell={cell}
            disabled={isDisabled}
            updateFn={value =>
              updateDraftLine({ id: row.original.id, costPricePerPack: value })
            }
          />
        ),
      },
      {
        id: 'foreignCurrencyCostPricePerPack',
        header: t('label.fc-cost-price', {
          currency: currency?.code,
        }),
        size: 100,
        columnGroup: 'pricing',
        accessorFn: row => {
          if (currency) {
            return row.costPricePerPack / currency.rate;
          }
          return undefined;
        },
        Cell: ({ cell }) => (
          <CurrencyInputCell cell={cell} disabled updateFn={() => {}} />
        ),
        includeColumn:
          isExternalSupplier && !!store?.preferences.issueInForeignCurrency,
      },
      {
        accessorKey: 'sellPricePerPack',
        header: t('label.pack-sell-price'),
        columnGroup: 'pricing',
        Cell: ({ cell, row }) => (
          <CurrencyInputCell
            cell={cell}
            disabled={isDisabled}
            updateFn={value =>
              updateDraftLine({ id: row.original.id, sellPricePerPack: value })
            }
          />
        ),
      },
      {
        id: 'foreignCurrencySellPricePerPack',
        header: t('label.fc-sell-price'),
        size: 100,
        columnGroup: 'pricing',
        accessorFn: row => {
          if (currency) {
            return row.sellPricePerPack / currency.rate;
          }
          return undefined;
        },
        Cell: ({ cell }) => (
          <CurrencyInputCell cell={cell} disabled updateFn={() => {}} />
        ),
        includeColumn:
          isExternalSupplier && !!store?.preferences.issueInForeignCurrency,
      },
      {
        accessorKey: 'lineTotal',
        header: t('label.line-total'),
        size: 100,
        columnGroup: 'pricing',
        accessorFn: row => row.costPricePerPack * row.numberOfPacks,
        Cell: ({ cell }) => (
          <CurrencyInputCell cell={cell} disabled updateFn={() => {}} />
        ),
      },
      {
        id: 'foreignCurrencyLineTotal',
        header: t('label.fc-line-total'),
        size: 100,
        columnGroup: 'pricing',
        accessorFn: row => {
          if (currency) {
            return (row.costPricePerPack * row.numberOfPacks) / currency.rate;
          }
          return undefined;
        },
        Cell: ({ cell }) => (
          <CurrencyInputCell cell={cell} disabled updateFn={() => {}} />
        ),
        includeColumn:
          isExternalSupplier && !!store?.preferences.issueInForeignCurrency,
      },
      {
        id: 'location',
        header: t('label.location'),
        columnGroup: 'general',
        Cell: ({ row: { original: row } }) => {
          return (
            <LocationSearchInput
              onChange={value =>
                updateDraftLine({ id: row.id, location: value })
              }
              disabled={isDisabled}
              selectedLocation={(row.location as LocationRowFragment) ?? null}
              volumeRequired={row.volumePerPack * row.numberOfPacks}
              restrictedToLocationTypeId={restrictedToLocationTypeId}
              fullWidth
            />
          );
        },
      },
      // --- Other columns ---
      {
        accessorKey: 'note',
        header: t('label.stocktake-comment'),
        size: 200,
        columnGroup: 'other',
        cardSpan: 2,
        Cell: ({ cell, row }) => (
          <TextInputCell
            cell={cell}
            updateFn={value =>
              updateDraftLine({ id: row.original.id, note: value })
            }
            disabled={isDisabled}
          />
        ),
        defaultHideOnMobile: true,
      },
      {
        id: 'donor',
        header: t('label.donor'),
        columnGroup: 'other',
        Cell: ({ row: { original: row } }) => (
          <DonorSearchInput
            donorId={row?.donor?.id || null}
            onChange={donor =>
              updateDraftLine({
                id: row.id,
                donor,
              })
            }
            disabled={isDisabled}
            fullWidth
            clearable
          />
        ),
        includeColumn: allowTrackingOfStockByDonor,
      },
      {
        id: 'campaignOrProgram',
        header: t('label.campaign'),
        columnGroup: 'other',
        Cell: ({ row }) => (
          <CampaignOrProgramCell
            row={row.original}
            disabled={isDisabled}
            updateFn={patch =>
              updateDraftLine({ id: row.original.id, ...patch })
            }
          />
        ),
      },
      // --- Delete column (no group) ---
      {
        id: 'delete',
        header: '',
        size: 50,
        pin: 'right',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    allowTrackingOfStockByDonor,
    currency,
    displayInDoses,
    hasItemVariantsEnabled,
    hasVvmStatusesEnabled,
    isDisabled,
    isExternalSupplier,
    item?.isVaccine,
    pluralisedUnitName,
    removeDraftLine,
    restrictedToLocationTypeId,
    setPackRoundingMessage,
    store?.preferences.issueInForeignCurrency,
    unitName,
    updateDraftLine,
  ]);

  const table = useSimpleMaterialTable<DraftInboundLine>({
    tableId: 'inbound-line-edit',
    columns,
    data: lines,
    getIsRestrictedRow: isDisabled ? () => true : undefined,
  });

  return (
    <>
      <Box sx={{ display: 'none' }}>
        <MaterialTable table={table} />
      </Box>
      <CardList
        table={table}
        lastItemRef={lastCardRef}
        groupIcons={{
          general: <EditIcon />,
          quantities: <StockIcon />,
          pricing: <InvoiceIcon />,
          other: <SlidersIcon />,
        }}
      />
    </>
  );
};
