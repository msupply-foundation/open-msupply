import React from 'react';
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
  DateUtils,
  ExpiryDateInput,
  Box,
  Accordion,
  AccordionSummary,
  Typography,
  AccordionDetails,
  Paper,
  Grid,
  BasicTextInput,
  NumericTextInput,
  CurrencyInput,
  InfoIcon,
  TruckIcon,
  InvoiceIcon,
  
} from '@openmsupply-client/common';
import { ChevronDownIcon } from '@common/icons';
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

interface InboundBatchedItemsProps {
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
interface InboundItemsProps extends InboundBatchedItemsProps {
  removeDraftLine: (id: string) => void;
}

export const InboundItems = ({
  lines,
  updateDraftLine,
  removeDraftLine,
  isDisabled = false,
  hasItemVariantsEnabled,
  hasVvmStatusesEnabled,
  item,
  setPackRoundingMessage,
  currency,
  isExternalSupplier,
  restrictedToLocationTypeId
}: InboundItemsProps) => {
  const t = useTranslation();
  const { store } = useAuthContext();
  const { getPlural } = useIntlUtils();
  const { format } = useFormatNumber();
  const { manageVaccinesInDoses, allowTrackingOfStockByDonor } = usePreferences();

  const displayInDoses = manageVaccinesInDoses && !!item?.isVaccine;
  const unitName = Formatter.sentenceCase(
    item?.unitName ? item.unitName : t('label.unit')
  );
  const pluralisedUnitName = getPlural(unitName, 2);
  const showForeignCurrency = isExternalSupplier && !!store?.preferences.issueInForeignCurrency;
  return (
    <Box>
      {lines.map((line, index) => (
    <Accordion key={line.id} defaultExpanded={index === 0}>
      <AccordionSummary expandIcon={<ChevronDownIcon />}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Typography variant="h6">
            <IconButton
              label={t('button.delete')}
              onClick={() => removeDraftLine(line.id)}
              icon={<DeleteIcon fontSize="small" />}
            />
            {`${t('label.batch')}: ${line.batch}`}
          </Typography>
          <Typography variant="h6">
            {t('label.units-received', { unit: pluralisedUnitName })}: {line.numberOfPacks * line.packSize}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Paper elevation={1} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon color="action" fontSize="small" />
            <Typography variant="body2" color="textSecondary">
              {t('label.quantities')}
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
                <Box>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                {t('label.batch')}
              </Typography>
              <BasicTextInput
                fullWidth
                value={line.batch || ''}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  updateDraftLine({ id: line.id, batch: event.target.value });
                }}
                disabled={isDisabled}
                autoFocus={index === 0}
              /></Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  {t('label.expiry-date')}
                </Typography>
              <ExpiryDateInput
                value={DateUtils.getDateOrNull(line.expiryDate)}
                onChange={(date) => {
                  updateDraftLine({ id: line.id, expiryDate: Formatter.naiveDate(date) });
                }}
                disabled={isDisabled}
              /></Box>
            </Grid>
            {hasItemVariantsEnabled && (
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  {t('label.item-variant')}
                </Typography>
                <ItemVariantInput
                  disabled={isDisabled}
                  selectedId={line.itemVariant?.id}
                  itemId={line.item.id}
                  width="100%"
                  onChange={(itemVariant) => {
                    updateDraftLine({
                      id: line.id,
                      itemVariantId: itemVariant?.id,
                      itemVariant,
                      volumePerPack: getVolumePerPackFromVariant({ packSize: line.packSize, itemVariant }),
                    });
                  }}
                />
              </Box>
            </Grid>
            )}   
            {hasVvmStatusesEnabled && item?.isVaccine && (
              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    {t('label.vvm-status')}
                  </Typography>
                  <VVMStatusSearchInput
                    disabled={isDisabled}
                    selected={line.vvmStatus ?? null}
                    onChange={(vvmStatus) => {
                      updateDraftLine({ id: line.id, vvmStatus });
                    }}
                    useDefault={!line.stockLine}
                  />
                </Box>
              </Grid>
            )}  
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  {t('label.shipped-pack-size')}
                </Typography>
                <NumericTextInput
                  fullWidth
                  value={line.shippedPackSize || 0}
                  onChange={(value: number | undefined) => {
                    updateDraftLine({ shippedPackSize: value, id: line.id });
                  }}
                  disabled={isDisabled}
                />
              </Box>
            </Grid>    
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  {t('label.shipped-number-of-packs')}
                </Typography>
                <NumericTextInput
                  fullWidth
                  value={line.shippedNumberOfPacks || 0}
                  onChange={(value: number | undefined) => {
                    updateDraftLine({ shippedNumberOfPacks: value, id: line.id });
                  }}
                  disabled={isDisabled}
                />
              </Box>
            </Grid>   
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  {t('label.received-pack-size')}
                </Typography>
                <NumericTextInput
                  fullWidth
                  value={line.packSize || 0}
                  onChange={(value: number | undefined) => {
                    const shouldClearSellPrice =
                      item?.defaultPackSize !== line.packSize &&
                      item?.itemStoreProperties?.defaultSellPricePerPack === line.sellPricePerPack;
                    updateDraftLine({
                      volumePerPack: getVolumePerPackFromVariant(line) ?? 0,
                      sellPricePerPack: shouldClearSellPrice ? 0 : line.sellPricePerPack,
                      packSize: value,
                      id: line.id,
                    });
                  }}
                  disabled={isDisabled}
                  min={1}
                />
              </Box>
            </Grid> 
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  {t('label.packs-received')}
                </Typography>
                <NumericTextInput
                  fullWidth
                  value={line.numberOfPacks || 0}
                  onChange={(value: number | undefined) => {
                    const { packSize } = line;
                    if (packSize !== undefined) {
                      const packToUnits = packSize * value;
                      setPackRoundingMessage?.('');
                      updateDraftLine({
                        unitsPerPack: packToUnits,
                        id: line.id,
                        numberOfPacks: value,
                      });
                    }
                  }}
                  disabled={isDisabled}
                  min={1}
                />
              </Box>
            </Grid>   
      
            {!displayInDoses && (
              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    {t('label.doses-received')}
                  </Typography>
                  <NumericTextInput
                    fullWidth
                    value={format((line.numberOfPacks * line.packSize) * line.item.doses)}
                    onChange={(value: number | undefined) => {
                      updateDraftLine({ volumePerPack: value, id: line.id });
                    }}
                    disabled={isDisabled}
                  />
                </Box>
              </Grid>
            )}  
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  {t('label.units-received', { unit: pluralisedUnitName })}
                </Typography>
                <NumericTextInput
                  fullWidth
                  value={line.numberOfPacks * line.packSize}
                  onChange={(value: number | undefined) => {
                    const { packSize, unitsPerPack } = line;
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
                        id: line.id,
                      });
                    }
                  }}
                  disabled={isDisabled}
                  min={0}
                />
              </Box>
            </Grid>   
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  {t('label.volume-per-pack')}
                </Typography>
                <NumericTextInput
                  fullWidth
                  value={line.volumePerPack || 0}
                  onChange={(value: number | undefined) => {
                    updateDraftLine({ volumePerPack: value, id: line.id });
                  }}
                  disabled={isDisabled}
                />
              </Box>
            </Grid>          
          </Grid>
        </Paper>
        <Paper elevation={1} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TruckIcon color="action" fontSize="small" />
            <Typography variant="body2" color="textSecondary">
              {t('label.pricing')}
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={showForeignCurrency ? 6 : 12}>
              <Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  {t('label.pack-cost-price')}
                </Typography>
                <CurrencyInput
                  // label={t('label.pack-cost-price')}
                  value={line.costPricePerPack || 0}
                  onChangeNumber={(value: number) => {
                    updateDraftLine({ id: line.id, costPricePerPack: value });
                  }}
                  disabled={isDisabled}
                  width="100%"
                />
              </Box>
            </Grid>
 
            {showForeignCurrency && currency && (
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="textSecondary">
                  <Typography component="span" fontWeight="bold">
                    {t('label.fc-cost-price', { currency: currency.code })}
                  </Typography>{' '}
                  {format(line.costPricePerPack / currency.rate)}
                </Typography>
              </Grid>
            )}  
            <Grid item xs={12} md={showForeignCurrency ? 6 : 12}>
              <Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  {t('label.pack-sell-price')}
                </Typography>
                <CurrencyInput
                  value={line.sellPricePerPack || 0}
                  onChangeNumber={(value: number) => {
                    updateDraftLine({ id: line.id, sellPricePerPack: value });
                  }}
                  disabled={isDisabled}
                  width="100%"
                />
              </Box>
            </Grid>   
            {showForeignCurrency && currency && (
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="textSecondary">
                  <Typography component="span" fontWeight="bold">
                    {t('label.fc-sell-price', { currency: currency.code })}
                  </Typography>{' '}
                  {format(line.sellPricePerPack / currency.rate)}
                </Typography>
              </Grid>
            )}   
            <Grid item xs={12} md={showForeignCurrency ? 6 : 12}>
              <Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  {t('label.line-total')}
                </Typography>
                <Typography variant="h6" color="textSecondary">
                  {format(line.costPricePerPack * line.numberOfPacks)}
                </Typography>
              </Box>
            </Grid> 
            {showForeignCurrency && currency && (
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="primary">
                  <Typography component="span" fontWeight="bold">
                    {t('label.fc-line-total', { currency: currency.code })}
                  </Typography>{' '}
                  {format((line.costPricePerPack * line.numberOfPacks) / currency.rate)}
                </Typography>
              </Grid>
            )}             
          </Grid>
        </Paper>
        <Paper elevation={1} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InvoiceIcon color="action" fontSize="small" />
            <Typography variant="body2" color="textSecondary">
              {t('heading.other')}
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={showForeignCurrency ? 6 : 12}>
              <Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  {t('label.location')}
                </Typography>
                <LocationSearchInput
                  onChange={(value: LocationRowFragment | null) => {
                    updateDraftLine({ id: line.id, location: value });
                  }}
                  selectedLocation={(line.location as LocationRowFragment) ?? null}
                  volumeRequired={line.volumePerPack * line.numberOfPacks}
                  restrictedToLocationTypeId={restrictedToLocationTypeId}
                  disabled={isDisabled}
                  fullWidth
                />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  {t('label.stocktake-comment')}
                </Typography>
                <BasicTextInput
                  fullWidth
                  value={line.note || ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    updateDraftLine({ id: line.id, note: event.target.value });
                  }}
                  disabled={isDisabled ?? false}
                  multiline
                />
              </Box>
            </Grid> 
            {allowTrackingOfStockByDonor && (
              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    {t('label.donor')}
                  </Typography>
                  <DonorSearchInput
                    donorId={line.donor?.id || null}
                    onChange={(donor) =>
                      updateDraftLine({
                        id: line.id,
                        donor,
                      })
                    }
                    disabled={isDisabled ?? false}
                    fullWidth
                    clearable
                  />
                </Box>
              </Grid>
            )}   
            <Grid item xs={12} md={allowTrackingOfStockByDonor ? 6 : 12}>
              <Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  {t('label.campaign')}
                </Typography>
                <CampaignOrProgramCell
                  row={line}
                  updateFn={(patch) =>
                    updateDraftLine({
                      id: line.id,
                      ...patch,
                    })
                  }
                  disabled={isDisabled ?? false}
                />
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </AccordionDetails>
    </Accordion>
  ))}
  </Box>
  );
};