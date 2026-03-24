import React, { useMemo, useRef, useState } from 'react';
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
  ColumnType,
  DateUtils,
  ExpiryDateInput,
  DateTimePickerInput,
  TextInputCell,
  NumberInputCell,
  CurrencyInputCell,
  CardList,
  Box,
  Typography,
  CopyIcon,
  StockIcon,
  InfoIcon,
  useSimplifiedTabletUI,
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
  ManufacturerSearchInput,
  VVMStatusSearchInput,
} from '@openmsupply-client/system';
import { PatchDraftLineInput } from '../../../api';
import { useInboundShipment } from '../../../api/hooks/document/useInboundShipment';
import { usePurchaseOrder } from '@openmsupply-client/purchasing/src/purchase_order/api';

interface CardProps {
  lines: DraftInboundLine[];
  updateDraftLine: (patch: PatchDraftLineInput) => void;
  isDisabled?: boolean;
  foreignCurrency?: CurrencyRowFragment | null;
  isExternalSupplier?: boolean;
  hasItemVariantsEnabled?: boolean;
  hasVvmStatusesEnabled?: boolean;
  item?: ItemRowFragment | null;
  setPackRoundingMessage?: (value: React.SetStateAction<string>) => void;
  restrictedToLocationTypeId?: string | null;
}

interface InboundLineEditCardsProps extends CardProps {
  duplicateDraftLine: (id: string) => void;
  removeDraftLine: (id: string) => void;
  lastCardRef?: React.RefObject<HTMLDivElement>;
  actions?: React.ReactNode;
}

export const InboundLineEditCards = ({
  lines,
  updateDraftLine,
  duplicateDraftLine,
  removeDraftLine,
  isDisabled = false,
  foreignCurrency,
  isExternalSupplier,
  hasItemVariantsEnabled,
  hasVvmStatusesEnabled,
  item,
  setPackRoundingMessage,
  restrictedToLocationTypeId,
  lastCardRef,
  actions,
}: InboundLineEditCardsProps) => {
  const t = useTranslation();
  const simplified = useSimplifiedTabletUI();
  const { getPlural } = useIntlUtils();
  const { format } = useFormatNumber();
  // Ref avoids format in useMemo deps (unstable reference)
  const formatRef = useRef(format);
  formatRef.current = format;
  const { store } = useAuthContext();
  const { manageVaccinesInDoses, allowTrackingOfStockByDonor } =
    usePreferences();

  const {
    query: { data: inboundData },
  } = useInboundShipment();
  const purchaseOrderId = inboundData?.purchaseOrder?.id;
  const isManualShipment =
    !inboundData?.purchaseOrder && !inboundData?.linkedShipment;
  const { query: poQuery } = usePurchaseOrder(purchaseOrderId);

  // Calculate outstanding packs for the current item from PO lines
  // Outstanding = ordered packs - shipped packs, calculated per-line using requestedPackSize
  const poOutstandingPacks = useMemo(() => {
    if (!purchaseOrderId || !item?.id || !poQuery.data) return null;
    let totalOutstandingPacks = 0;
    for (const line of poQuery.data.lines.nodes) {
      if (line.item.id === item.id) {
        const orderedUnits =
          line.adjustedNumberOfUnits ?? line.requestedNumberOfUnits;
        const shippedUnits = line.shippedNumberOfUnits ?? 0;
        const packSize = line.requestedPackSize || 1;
        const orderedPacks = Math.ceil(orderedUnits / packSize);
        const shippedPacks = Math.ceil(shippedUnits / packSize);
        totalOutstandingPacks += orderedPacks - shippedPacks;
      }
    }
    return totalOutstandingPacks;
  }, [purchaseOrderId, item?.id, poQuery.data]);

  const displayInDoses = manageVaccinesInDoses && !!item?.isVaccine;
  const unitName = Formatter.sentenceCase(
    item?.unitName ? item.unitName : t('label.unit')
  );
  const pluralisedUnitName = getPlural(unitName, 2);

  // Track which line to auto-focus packs received on:
  // - initial mount / item change → first line
  // - line added / duplicated → the new line
  const prevLineIdsRef = useRef<Set<string> | null>(null);
  const autoFocusLineIdRef = useRef<string | null>(null);
  const currentLineIds = new Set(lines.map(l => l.id));
  if (prevLineIdsRef.current === null) {
    // Initial mount: focus first line
    autoFocusLineIdRef.current = lines[0]?.id ?? null;
  } else {
    for (const id of currentLineIds) {
      if (!prevLineIdsRef.current.has(id)) {
        autoFocusLineIdRef.current = id;
      }
    }
  }
  prevLineIdsRef.current = currentLineIds;

  const columns = useMemo(() => {
    const cols: ColumnDef<DraftInboundLine>[] = [
      // --- Stock line details fields ---
      {
        accessorKey: 'numberOfPacks',
        header: t('label.packs-received'),
        size: 100,
        columnGroup: 'stockLineDetails',
        cardSummary: row => {
          const units = row.numberOfPacks * row.packSize;
          return `${t('label.received')} ${formatRef.current(row.numberOfPacks)} ${getPlural(t('label.pack'), row.numberOfPacks)} (${formatRef.current(units)} ${pluralisedUnitName.toLowerCase()})`;
        },
        cardSummaryOrder: 1,
        Cell: ({ row, cell }) => {
          const [hasBlurred, setHasBlurred] = useState(false);
          const line = row.original;
          const shippedPacks = line.shippedNumberOfPacks;
          const showWarning =
            hasBlurred &&
            shippedPacks != null &&
            line.numberOfPacks !== shippedPacks;
          return (
            <Box onBlur={() => setHasBlurred(true)}>
              <NumberInputCell
                cell={cell}
                autoFocus={row.original.id === autoFocusLineIdRef.current}
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
              {showWarning && (
                <Typography
                  variant="caption"
                  color="warning.main"
                  sx={{ mt: 0.5, display: 'block' }}
                >
                  {`${t('label.shipped-number-of-packs')}: ${shippedPacks}`}
                </Typography>
              )}
              {!!purchaseOrderId && poOutstandingPacks != null && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: 'block' }}
                >
                  {`${t('label.outstanding-packs')}: ${poOutstandingPacks}`}
                </Typography>
              )}
            </Box>
          );
        },
      },
      {
        accessorKey: 'packSize',
        header: t('label.received-pack-size'),
        size: 120,
        columnGroup: 'stockLineDetails',
        Cell: ({ row, cell }) => {
          const [hasBlurred, setHasBlurred] = useState(false);
          const line = row.original;
          const shippedPackSize = line.shippedPackSize;
          const showWarning =
            hasBlurred &&
            shippedPackSize != null &&
            line.packSize !== shippedPackSize;
          return (
            <Box onBlur={() => setHasBlurred(true)}>
              <NumberInputCell
                cell={cell}
                updateFn={(value: number) => {
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
              {showWarning && (
                <Typography
                  variant="caption"
                  color="warning.main"
                  sx={{ mt: 0.5, display: 'block' }}
                >
                  {`${t('label.shipped-pack-size')}: ${shippedPackSize}`}
                </Typography>
              )}
            </Box>
          );
        },
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'shippedNumberOfPacks',
        header: t('label.shipped-number-of-packs'),
        size: 100,
        columnGroup: 'stockLineDetails',
        includeColumn: isManualShipment,
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
        accessorKey: 'shippedPackSize',
        header: t('label.shipped-pack-size'),
        size: 120,
        columnGroup: 'stockLineDetails',
        includeColumn: isManualShipment,
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
        accessorKey: 'receivedNumberOfUnits',
        header: t('label.units-received', {
          unit: pluralisedUnitName,
        }),
        size: 120,
        defaultHideOnMobile: true,
        columnGroup: 'stockLineDetails',
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
                      receivedQuantity: formatRef.current(
                        NumUtils.round(value, 2)
                      ),
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
            debounceTime={500} // workaround for the fact that changing packs updates units, which updates packs, etc. without waiting for debounce to trigger an update
          />
        ),
      },
      {
        accessorKey: 'doseQuantity',
        header: t('label.doses-received'),
        size: 100,
        columnGroup: 'stockLineDetails',
        includeColumn: displayInDoses,
        accessorFn: row => {
          const total = row.numberOfPacks * row.packSize;
          return formatRef.current(total * row.item.doses);
        },
      },
      // --- More info fields ---
      {
        accessorKey: 'costPricePerPack',
        header: t('label.pack-cost-price'),
        columnGroup: 'moreInfo',
        defaultHideOnMobile: true,
        Cell: ({ cell, row }) => (
          <CurrencyInputCell
            cell={cell}
            disabled={isDisabled || !isExternalSupplier || !!purchaseOrderId}
            updateFn={value =>
              updateDraftLine({ id: row.original.id, costPricePerPack: value })
            }
          />
        ),
      },
      {
        id: 'foreignCurrencyCostPricePerPack',
        header: t('label.fc-cost-price', {
          currency: foreignCurrency?.code,
        }),
        size: 100,
        columnGroup: 'moreInfo',
        accessorFn: row => {
          if (foreignCurrency) {
            return row.costPricePerPack / foreignCurrency.rate;
          }
          return undefined;
        },
        Cell: ({ cell }) => (
          <CurrencyInputCell
            cell={cell}
            disabled
            currencyCode={foreignCurrency?.code}
          />
        ),
        includeColumn:
          isExternalSupplier && !!store?.preferences.issueInForeignCurrency,
      },
      {
        accessorKey: 'sellPricePerPack',
        header: t('label.pack-sell-price'),
        columnGroup: 'moreInfo',
        defaultHideOnMobile: true,
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
        accessorKey: 'lineTotal',
        header: t('label.line-total'),
        size: 100,
        columnGroup: 'moreInfo',
        defaultHideOnMobile: true,
        accessorFn: row => row.costPricePerPack * row.numberOfPacks,
        Cell: ({ cell }) => <CurrencyInputCell cell={cell} disabled />,
      },
      {
        id: 'foreignCurrencyLineTotal',
        header: t('label.fc-line-total'),
        size: 100,
        columnGroup: 'moreInfo',
        accessorFn: row => {
          if (foreignCurrency) {
            return (
              (row.costPricePerPack * row.numberOfPacks) / foreignCurrency.rate
            );
          }
          return undefined;
        },
        Cell: ({ cell }) => (
          <CurrencyInputCell
            cell={cell}
            disabled
            currencyCode={foreignCurrency?.code}
          />
        ),
        includeColumn:
          isExternalSupplier && !!store?.preferences.issueInForeignCurrency,
      },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        size: 100,
        columnGroup: 'stockLineDetails',
        cardSummary: row => `${t('label.batch')} ${row.batch || ''}`,
        cardSummaryOrder: 0,
        Cell: ({ row, cell }) => (
          <TextInputCell
            cell={cell}
            updateFn={(batch: string) =>
              updateDraftLine({ id: row.original.id, batch })
            }
          />
        ),
      },
      {
        accessorKey: 'expiryDate',
        header: t('label.expiry-date'),
        size: 150,
        columnType: ColumnType.Date,
        columnGroup: 'stockLineDetails',
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
        id: 'location',
        header: t('label.location'),
        columnGroup: 'stockLineDetails',
        defaultHideOnMobile: true,
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
      {
        id: 'vvmStatus',
        header: t('label.vvm-status'),
        size: 150,
        columnGroup: 'stockLineDetails',
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
        accessorKey: 'note',
        header: t('label.stocktake-comment'),
        size: 200,
        columnGroup: 'stockLineDetails',
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
        id: 'itemDoses',
        header: t('label.doses-per-unit'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
        columnGroup: 'moreInfo',
        includeColumn: displayInDoses,
        accessorFn: row => (row.item.isVaccine ? row.item.doses : undefined),
      },
      {
        id: 'manufactureDate',
        header: t('label.manufacture-date'),
        size: 150,
        columnType: ColumnType.Date,
        columnGroup: 'moreInfo',
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
        id: 'donor',
        header: t('label.donor'),
        columnGroup: 'moreInfo',
        defaultHideOnMobile: true,
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
        columnGroup: 'moreInfo',
        defaultHideOnMobile: true,
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
      {
        id: 'manufacturer',
        header: t('label.manufacturer'),
        columnGroup: 'moreInfo',
        defaultHideOnMobile: true,
        Cell: ({ row: { original: row } }) => (
          <ManufacturerSearchInput
            value={row.manufacturer ?? null}
            disabled={isDisabled}
            onChange={manufacturer => {
              updateDraftLine({
                id: row.id,
                manufacturer: manufacturer ?? undefined,
                ...(row.itemVariant
                  ? { itemVariantId: null, itemVariant: null }
                  : {}),
              });
            }}
            fullWidth
          />
        ),
      },
      {
        accessorKey: 'volumePerPack',
        header: t('label.volume-per-pack'),
        size: 140,
        columnGroup: 'moreInfo',
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
        id: 'itemVariant',
        header: t('label.item-variant'),
        accessorFn: row => row.itemVariant?.id || '',
        size: 150,
        columnGroup: 'moreInfo',
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
                manufacturer: itemVariant?.manufacturer ?? null,
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
      // --- Actions (no group) ---
      {
        id: 'duplicate',
        header: '',
        size: 50,
        pin: 'right',
        Cell: ({ row }) => (
          <IconButton
            disabled={isDisabled}
            label={t('label.duplicate-batch')}
            showLabel={!simplified}
            onClick={() => {
              duplicateDraftLine(row.original.id);
              setTimeout(() => {
                lastCardRef?.current?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'nearest',
                });
              }, 0);
            }}
            icon={<CopyIcon fontSize="small" />}
          />
        ),
      },
      {
        id: 'delete',
        header: '',
        size: 50,
        pin: 'right',
        Cell: ({ row }) => (
          <IconButton
            label={t('label.delete-batch')}
            showLabel={!simplified}
            color="error"
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
    foreignCurrency,
    displayInDoses,
    duplicateDraftLine,
    hasItemVariantsEnabled,
    hasVvmStatusesEnabled,
    isDisabled,
    isExternalSupplier,
    isManualShipment,
    item?.isVaccine,
    pluralisedUnitName,
    poOutstandingPacks,
    removeDraftLine,
    restrictedToLocationTypeId,
    setPackRoundingMessage,
    simplified,
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

  const groupIcons = simplified
    ? undefined
    : {
        stockLineDetails: <StockIcon />,
        moreInfo: <InfoIcon />,
      };

  return (
    <>
      <CardList
        table={table}
        lastItemRef={lastCardRef}
        groupIcons={groupIcons}
        labelsAbove={simplified}
        actions={actions}
      />
    </>
  );
};
