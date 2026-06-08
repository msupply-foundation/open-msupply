import React from 'react';
import {
  DateUtils,
  Formatter,
  CurrencyInput,
  ExpiryDateInput,
  DateTimePickerInput,
  useTranslation,
  Box,
  IconButton,
  ScanIcon,
  useBarcodeScannerContext,
  useNotification,
  Tooltip,
  NumericTextInput,
  BufferedTextInput,
  usePluginProvider,
  UsePluginEvents,
  useRegisterActions,
  usePreferences,
  ReasonOptionNodeType,
  QuantityUtils,
  Alert,
  RouteBuilder,
  Link,
  Grid,
  Stack,
  Typography,

  Paper,
  Chip,
} from '@openmsupply-client/common';
import { Switch, styled } from '@mui/material';
import { DraftStockLine, StockLineRowFragment } from '../api';
import { LocationSearchInput } from '../../Location/Components/LocationSearchInput';
import {
  checkInvalidLocationLines,
  DonorSearchInput,
  ManufacturerSearchInput,
  ReasonOptionsSearchInput,
  VVMStatusSearchInput,
} from '../..';
import { CampaignOrProgramSelector } from './Campaign';
import { AppRoute } from '@openmsupply-client/config';

interface StockLineFormProps {
  draft: DraftStockLine;
  loading: boolean;
  onUpdate: (patch: Partial<DraftStockLine>) => void;
  pluginEvents: UsePluginEvents<{ isDirty: boolean }>;
  packEditable?: boolean;
  isNewModal?: boolean;
  existingStockLine?: StockLineRowFragment | null;
}

// styled() injects at a higher CSS order than sx, reliably overriding MUI's
// internal opacity: 0.38 on the track without needing !important.
const OnHoldSwitch = styled(Switch)(({ theme }) => ({
  '& .MuiSwitch-switchBase:not(.Mui-checked) + .MuiSwitch-track': {
    backgroundColor: '#8c8c8c',
    opacity: 1,
  },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: theme.palette.secondary.main,
    opacity: 1,
  },
}));

export const StockLineForm = ({
  draft,
  loading,
  onUpdate,
  pluginEvents,
  packEditable,
  isNewModal = false,
  existingStockLine = null,
}: StockLineFormProps) => {
  const t = useTranslation();
  const { error } = useNotification();

  const preferences = usePreferences();

  const { isConnected, isEnabled, isListening, scan } =
    useBarcodeScannerContext();
  const { plugins } = usePluginProvider();

  const showVVMStatus =
    draft?.item?.isVaccine &&
    (preferences.manageVvmStatusForStock ||
      preferences.sortByVvmStatusThenExpiry);

  const supplierName = draft.supplierName
    ? draft.supplierName
    : t('message.no-supplier');
  const location = draft?.location ?? null;

  const scanBarcode = async () => {
    try {
      const result = await scan();
      if (!!result.content) {
        const { batch, content, expiryDate, gtin } = result;
        const barcode = gtin ?? content;
        onUpdate({ barcode, batch, expiryDate });
      }
    } catch (e) {
      error(t('error.unable-to-scan-barcode', { error: e }))();
    }
  };

  const keyboardActions = isEnabled
    ? [
        {
          id: 'scan',
          name: `${t('button.scan')} (Ctrl+S)`,
          shortcut: ['Control+KeyS'],
          perform: scanBarcode,
        },
      ]
    : [];
  useRegisterActions(keyboardActions);

  if (loading) return null;

  const getDosesProps = (numPacks: number) => {
    if (!preferences.manageVaccinesInDoses || !draft.item.isVaccine) return {};

    const doses = QuantityUtils.packsToDoses(numPacks, {
      packSize: draft.packSize,
      dosesPerUnit: draft.item.doses,
    });

    return {
      helperText: `${doses} ${t('label.doses').toLowerCase()}`,
      sx: {
        '& .MuiFormHelperText-root': {
          textAlign: 'right',
        },
      },
    };
  };

  const restrictedLocationTypeId = draft.item.restrictedLocationTypeId ?? null;
  const isInvalidLocation = checkInvalidLocationLines(
    restrictedLocationTypeId,
    [draft]
  );

  return (
    <Box sx={{ p: 3, width: '100%', maxWidth: 800, mx: 'auto' }}>
      {isInvalidLocation && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('messages.stock-location-invalid')}
        </Alert>
      )}

      {/* ITEM HEADER + STAT TILES (detail view only) */}
      {!isNewModal && (
        <Box mb={2}>
          {/* Name + chips inline */}
          <Stack direction="row" alignItems="center" gap={1} mb={1.5} flexWrap="wrap">
            <Typography variant="h6" fontWeight={700}>
              <Link
                to={RouteBuilder.create(AppRoute.Catalogue)
                  .addPart(AppRoute.Items)
                  .addPart(draft.itemId)
                  .build()}
              >
                {draft.item.name}
              </Link>
            </Typography>
            <Chip label={draft.item.code} size="small" sx={{ fontWeight: 600 }} />
            {draft.item.unitName && (
              <Chip label={draft.item.unitName} size="small" variant="outlined" />
            )}
          </Stack>

          {/* 4 tiles — tinted background distinguishes summary from editable form */}
          <Box sx={{ backgroundColor: 'background.toolbar', borderRadius: 1, p: 1.5 }}>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper variant="outlined" sx={{ px: 2, py: 1.25 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  {t('label.pack-quantity')}
                </Typography>
                <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                  {draft.totalNumberOfPacks}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('label.pack')}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper variant="outlined" sx={{ px: 2, py: 1.25 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  {t('label.available-packs')}
                </Typography>
                <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                  {parseFloat(draft.availableNumberOfPacks.toFixed(2))}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('label.pack')}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper variant="outlined" sx={{ px: 2, py: 1.25 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  {t('label.soh')}
                </Typography>
                <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                  {parseFloat(
                    (draft.totalNumberOfPacks * draft.packSize).toFixed(2)
                  ).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {draft.item.unitName ?? t('label.units')}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper variant="outlined" sx={{ px: 2, py: 1.25, height: '100%' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  {t('label.on-hold')}
                </Typography>
                <OnHoldSwitch
                  checked={draft.onHold}
                  onChange={(_, onHold) => onUpdate({ onHold })}
                  size="small"
                  sx={{ ml: -1 }}
                />
                <Typography variant="caption" color="text.secondary" display="block">
                  {t('messages.stock-batch-on-hold')}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
          </Box>
        </Box>
      )}

      {/* SECTIONS */}
      <Stack gap={3}>
        {/* PRICING & BATCH */}
        <Box>
          <Typography variant="subtitle2" fontWeight={700} mb={1} mt={2}>
            {t('title.pricing-and-batch')}
          </Typography>
          <Grid container rowSpacing={2.5} columnSpacing={2}>
            <Grid size={{ xs: 6, sm: 2 }}>
              <CurrencyInput
                label={t('label.cost-price')}
                autoFocus={!packEditable}
                value={draft.costPricePerPack}
                onChangeNumber={costPricePerPack =>
                  onUpdate({ costPricePerPack })
                }
                disabled={false}
                width="100%"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 2 }}>
              <CurrencyInput
                label={t('label.sell-price')}
                value={draft.sellPricePerPack}
                onChangeNumber={sellPricePerPack =>
                  onUpdate({ sellPricePerPack })
                }
                disabled={false}
                width="100%"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <BufferedTextInput
                fullWidth
                label={t('label.batch')}
                value={draft.batch ?? ''}
                onChange={e => onUpdate({ batch: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <ExpiryDateInput
                label={t('label.expiry')}
                value={DateUtils.getNaiveDate(draft.expiryDate)}
                onChange={date =>
                  onUpdate({ expiryDate: Formatter.naiveDate(date) })
                }
                width="100%"
              />
            </Grid>
          </Grid>
        </Box>

        {/* STORAGE */}
        <Box>
          <Typography variant="subtitle2" fontWeight={700} mb={1} mt={2}>
            {t('title.storage')}
          </Typography>
          <Grid container rowSpacing={2.5} columnSpacing={2}>
            {/* Row 1: Location + Barcode */}
            <Grid size={{ xs: 12, sm: 5 }}>
              <LocationSearchInput
                label={t('label.location')}
                autoFocus={false}
                disabled={false}
                selectedLocation={location}
                fullWidth
                originalSelectedLocation={existingStockLine?.location}
                onChange={location => {
                  onUpdate({ location, locationId: location?.id });
                }}
                restrictedToLocationTypeId={draft.item.restrictedLocationTypeId}
                volumeRequired={draft.volumePerPack * draft.totalNumberOfPacks}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 7 }}>
              <Box display="flex" alignItems="center" gap={1}>
                <BufferedTextInput
                  fullWidth
                  label={t('label.barcode')}
                  value={draft.barcode ?? ''}
                  onChange={e => onUpdate({ barcode: e.target.value })}
                />
                {isEnabled && (
                  <Tooltip
                    title={
                      isConnected ? '' : t('error.scanner-not-connected')
                    }
                  >
                    <Box>
                      <IconButton
                        disabled={isListening || !isConnected}
                        onClick={scanBarcode}
                        icon={<ScanIcon />}
                        label={
                          isListening
                            ? `${t('button.listening-for-scans')} 🟢`
                            : t('button.scan')
                        }
                      />
                    </Box>
                  </Tooltip>
                )}
              </Box>
            </Grid>
            {/* Row 2: Pack size + Volume per pack + Total volume */}
            <Grid size={{ xs: 6, sm: 2 }}>
              <NumericTextInput
                fullWidth
                disabled={!packEditable}
                label={t('label.pack-size')}
                value={draft.packSize ?? 1}
                onChange={packSize => {
                  const shouldClearPrice =
                    draft.item?.defaultPackSize !== packSize &&
                    draft.item?.itemStoreProperties
                      ?.defaultSellPricePerPack === draft.sellPricePerPack;
                  onUpdate({
                    packSize,
                    sellPricePerPack: shouldClearPrice
                      ? 0
                      : draft.sellPricePerPack,
                  });
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <NumericTextInput
                fullWidth
                label={t('label.volume-per-pack')}
                value={draft.volumePerPack ?? 0}
                decimalLimit={10}
                onChange={volumePerPack => onUpdate({ volumePerPack })}
              />
            </Grid>
            {!packEditable && (
              <Grid size={{ xs: 12, sm: 5 }}>
                <NumericTextInput
                  fullWidth
                  disabled
                  label={t('label.total-volume')}
                  decimalLimit={10}
                  value={(draft.volumePerPack ?? 0) * draft.totalNumberOfPacks}
                />
              </Grid>
            )}
            {showVVMStatus && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <VVMStatusSearchInput
                  label={t('label.vvm-status')}
                  selected={draft?.vvmStatus ?? null}
                  onChange={vvmStatus => onUpdate({ vvmStatus })}
                  disabled={!isNewModal}
                  useDefault={isNewModal}
                />
              </Grid>
            )}
          </Grid>
        </Box>

        {/* PROVENANCE */}
        <Box>
          <Typography variant="subtitle2" fontWeight={700} mb={1} mt={2}>
            {t('title.supply-chain')}
          </Typography>
          <Grid container rowSpacing={2.5} columnSpacing={2}>
            {/* Row 1: Supplier + Manufacture date */}
            <Grid size={{ xs: 12, sm: 8 }}>
              <BufferedTextInput
                fullWidth
                label={t('label.supplier')}
                value={String(supplierName)}
                disabled
                slotProps={{ htmlInput: { readOnly: true } }}
                onChange={() => {}}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <DateTimePickerInput
                label={t('label.manufacture-date')}
                value={DateUtils.getNaiveDate(draft.manufactureDate)}
                onChange={date =>
                  onUpdate({
                    manufactureDate: date ? Formatter.naiveDate(date) : null,
                  })
                }
                width="100%"
              />
            </Grid>
            {/* Row 2: Manufacturer + Campaign on same row */}
            <Grid size={{ xs: 12, sm: 7 }}>
              <ManufacturerSearchInput
                label={t('label.manufacturer')}
                value={draft.manufacturer ?? null}
                fullWidth
                onChange={manufacturer => {
                  const patch: Partial<DraftStockLine> = { manufacturer };
                  if (draft.itemVariant) {
                    patch.itemVariant = null;
                  }
                  onUpdate(patch);
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <CampaignOrProgramSelector
                label={t('label.campaign')}
                campaignId={draft.campaign?.id}
                programId={draft.program?.id}
                programOptionsOrFilter={{ filterByItemId: draft.itemId }}
                onChange={({ campaign, program }) =>
                  onUpdate({ campaign, program })
                }
                fullWidth
              />
            </Grid>
            {/* Donor (conditional) */}
            {preferences.allowTrackingOfStockByDonor && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <DonorSearchInput
                  label={t('label.donor')}
                  donorId={draft.donor?.id ?? null}
                  fullWidth
                  onChange={donor => onUpdate({ donor })}
                  clearable
                />
              </Grid>
            )}
          </Grid>
        </Box>

        {/* QUANTITIES (new modal only) */}
        {isNewModal && (
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1} mt={2}>
              {t('title.quantities')}
            </Typography>
            <Grid container rowSpacing={2.5} columnSpacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <NumericTextInput
                  autoFocus
                  fullWidth
                  label={t('label.pack-quantity')}
                  disabled={!packEditable}
                  value={draft.totalNumberOfPacks ? draft.totalNumberOfPacks : 0}
                  onChange={totalNumberOfPacks =>
                    onUpdate({ totalNumberOfPacks })
                  }
                  {...getDosesProps(draft.totalNumberOfPacks)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <ReasonOptionsSearchInput
                  type={ReasonOptionNodeType.PositiveInventoryAdjustment}
                  value={draft.reasonOption}
                  onChange={reason => onUpdate({ reasonOption: reason })}
                  disabled={draft?.totalNumberOfPacks === 0}
                />
              </Grid>
            </Grid>
          </Box>
        )}
      </Stack>

      {/* PLUGIN FIELDS */}
      {plugins.stockLine?.editViewField.map((Plugin, index) => (
        <Plugin key={index} stockLine={draft} events={pluginEvents} />
      ))}
    </Box>
  );
};
