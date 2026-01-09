import React from 'react';
import {
  Checkbox,
  Grid,
  DateUtils,
  Formatter,
  TextWithLabelRow,
  CurrencyInput,
  ExpiryDateInput,
  useTranslation,
  Box,
  IconButton,
  ScanIcon,
  useBarcodeScannerContext,
  CircularProgress,
  useNotification,
  Tooltip,
  NumericTextInput,
  BufferedTextInput,
  DetailContainer,
  usePluginProvider,
  UsePluginEvents,
  useRegisterActions,
  usePreferences,
  ReasonOptionNodeType,
  QuantityUtils,
  Alert,
  RouteBuilder,
  Link,
  FormLabel,
} from '@openmsupply-client/common';
import { DraftStockLine, StockLineRowFragment } from '../api';
import { LocationSearchInput } from '../../Location/Components/LocationSearchInput';
import {
  checkInvalidLocationLines,
  DonorSearchInput,
  ReasonOptionsSearchInput,
  VVMStatusSearchInput,
} from '../..';
import { INPUT_WIDTH, StyledInputRow } from './StyledInputRow';
import {
  getVolumePerPackFromVariant,
  ItemVariantInput,
  useIsItemVariantsEnabled,
} from '../../Item';
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

  const { isConnected, isEnabled, isScanning, scan } =
    useBarcodeScannerContext();
  const showItemVariantsInput = useIsItemVariantsEnabled();
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
        const draft = {
          barcode,
          batch,
          expiryDate,
        };

        onUpdate(draft);
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
      dosesPerUnit: draft.item.dosesPerUnit,
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
    <DetailContainer>
      <Grid container direction="column">
        {isInvalidLocation && (
          <Grid container justifyContent="center">
            <Alert severity="warning" sx={{ maxWidth: 800 }}>
              {t('messages.stock-location-invalid')}
            </Alert>
          </Grid>
        )}
        <Grid
          flex={1}
          container
          flexDirection="column"
          paddingTop={2}
          width="100%"
          flexWrap="nowrap"
          maxWidth={900}
        >
          {!isNewModal && (
            <Box paddingBottom={1}>
              <Box display="flex" alignItems="center">
                <Box style={{ textAlign: 'end', whiteSpace: 'nowrap' }}>
                  <FormLabel
                    sx={{
                      fontWeight: 'bold',
                      display: 'inline-block',
                      width: '100px',
                    }}
                  >
                    {t('label.item')}:
                  </FormLabel>
                </Box>
                <Box paddingLeft={1} paddingRight={1.5}>
                  <Box>
                    <Link
                      to={RouteBuilder.create(AppRoute.Catalogue)
                        .addPart(AppRoute.Items)
                        .addPart(draft.itemId)
                        .build()}
                    >
                      {draft.item.name}
                    </Link>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
          <Box>
            <Grid container gap={isNewModal ? undefined : 10}>
              <Grid container flex={1} flexDirection="column" gap={1}>
                <StyledInputRow
                  label={t('label.pack-quantity')}
                  Input={
                    <NumericTextInput
                      autoFocus
                      disabled={!packEditable}
                      width={160}
                      value={
                        draft.totalNumberOfPacks ? draft.totalNumberOfPacks : 0
                      }
                      onChange={totalNumberOfPacks =>
                        onUpdate({ totalNumberOfPacks })
                      }
                      {...getDosesProps(draft.totalNumberOfPacks)}
                    />
                  }
                />
                {!packEditable && (
                  <>
                    <StyledInputRow
                      label={t('label.available-packs')}
                      Input={
                        <NumericTextInput
                          autoFocus
                          disabled={!packEditable}
                          width={160}
                          value={parseFloat(
                            draft.availableNumberOfPacks.toFixed(2)
                          )}
                          onChange={availableNumberOfPacks =>
                            onUpdate({ availableNumberOfPacks })
                          }
                          {...getDosesProps(draft.availableNumberOfPacks)}
                        />
                      }
                    />
                  </>
                )}
                <StyledInputRow
                  label={t('label.cost-price')}
                  Input={
                    <CurrencyInput
                      autoFocus={!packEditable}
                      value={draft.costPricePerPack}
                      onChangeNumber={costPricePerPack =>
                        onUpdate({ costPricePerPack })
                      }
                    />
                  }
                />
                <StyledInputRow
                  label={t('label.sell-price')}
                  Input={
                    <CurrencyInput
                      value={draft.sellPricePerPack}
                      onChangeNumber={sellPricePerPack =>
                        onUpdate({ sellPricePerPack })
                      }
                    />
                  }
                />
                <StyledInputRow
                  label={t('label.expiry')}
                  Input={
                    <ExpiryDateInput
                      value={DateUtils.getNaiveDate(draft.expiryDate)}
                      onChange={date =>
                        onUpdate({ expiryDate: Formatter.naiveDate(date) })
                      }
                      width={160}
                    />
                  }
                />
                <StyledInputRow
                  label={t('label.batch')}
                  Input={
                    <BufferedTextInput
                      value={draft.batch ?? ''}
                      onChange={e => onUpdate({ batch: e.target.value })}
                    />
                  }
                />
                <StyledInputRow
                  label={t('label.barcode')}
                  Input={
                    <Box style={{ width: 162 }}>
                      <BufferedTextInput
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
                              disabled={isScanning || !isConnected}
                              onClick={scanBarcode}
                              icon={
                                isScanning ? (
                                  <CircularProgress
                                    size={20}
                                    color="secondary"
                                  />
                                ) : (
                                  <ScanIcon />
                                )
                              }
                              label={t('button.scan')}
                            />
                          </Box>
                        </Tooltip>
                      )}
                    </Box>
                  }
                />
                {isNewModal && (
                  <StyledInputRow
                    label={t('label.reason')}
                    Input={
                      <ReasonOptionsSearchInput
                        width={INPUT_WIDTH}
                        type={ReasonOptionNodeType.PositiveInventoryAdjustment}
                        value={draft.reasonOption}
                        onChange={reason => onUpdate({ reasonOption: reason })}
                        disabled={draft?.totalNumberOfPacks === 0}
                      />
                    }
                  />
                )}
                {plugins.stockLine?.editViewField.map((Plugin, index) => (
                  <Plugin key={index} stockLine={draft} events={pluginEvents} />
                ))}
              </Grid>
              <Grid container flex={1} flexDirection="column" gap={1}>
                <StyledInputRow
                  label={t('label.pack-size')}
                  Input={
                    <NumericTextInput
                      disabled={!packEditable}
                      width={160}
                      value={draft.packSize ?? 1}
                      onChange={packSize => {
                        const shouldClearPrice =
                          draft.item?.defaultPackSize !== packSize &&
                          draft.item?.itemStoreProperties
                            ?.defaultSellPricePerPack ===
                            draft.sellPricePerPack;

                        onUpdate({
                          packSize,
                          sellPricePerPack: shouldClearPrice
                            ? 0
                            : draft.sellPricePerPack,
                        });
                      }}
                    />
                  }
                />
                <StyledInputRow
                  label={t('label.on-hold')}
                  Input={
                    <Checkbox
                      checked={draft.onHold}
                      onChange={(_, onHold) => onUpdate({ onHold })}
                    />
                  }
                />
                <StyledInputRow
                  label={t('label.location')}
                  Input={
                    <LocationSearchInput
                      autoFocus={false}
                      disabled={false}
                      selectedLocation={location}
                      width={160}
                      originalSelectedLocation={existingStockLine?.location}
                      onChange={location => {
                        onUpdate({ location, locationId: location?.id });
                      }}
                      restrictedToLocationTypeId={
                        draft.item.restrictedLocationTypeId
                      }
                      volumeRequired={
                        draft.volumePerPack * draft.totalNumberOfPacks
                      }
                    />
                  }
                />
                {showItemVariantsInput && (
                  <StyledInputRow
                    label={t('label.item-variant')}
                    Input={
                      <ItemVariantInput
                        itemId={draft.itemId}
                        selectedId={draft?.itemVariant?.id}
                        width={160}
                        onChange={variant => {
                          const newVolume = getVolumePerPackFromVariant({
                            itemVariant: variant,
                            packSize: draft.packSize,
                          });

                          onUpdate({
                            itemVariant: variant,
                            volumePerPack: newVolume ?? 0,
                          });
                        }}
                      />
                    }
                  />
                )}
                <StyledInputRow
                  label={t('label.volume-per-pack')}
                  Input={
                    <NumericTextInput
                      width={160}
                      value={draft.volumePerPack ?? 0}
                      decimalLimit={10}
                      onChange={volumePerPack => onUpdate({ volumePerPack })}
                    />
                  }
                />
                {!packEditable && (
                  <StyledInputRow
                    label={t('label.total-volume')}
                    Input={
                      <NumericTextInput
                        disabled
                        width={160}
                        decimalLimit={10}
                        // Need to coalesce to 0 to avoid NaN while user is editing volumePerPack!
                        value={
                          (draft.volumePerPack ?? 0) * draft.totalNumberOfPacks
                        }
                      />
                    }
                  />
                )}
                <TextWithLabelRow
                  label={t('label.supplier')}
                  text={String(supplierName)}
                  textProps={{ textAlign: 'end' }}
                />
                {showVVMStatus && (
                  <StyledInputRow
                    label={t('label.vvm-status')}
                    labelWidth={isNewModal ? '212px' : null}
                    Input={
                      <VVMStatusSearchInput
                        selected={draft?.vvmStatus ?? null}
                        onChange={vvmStatus => onUpdate({ vvmStatus })}
                        disabled={!isNewModal}
                        width={!isNewModal ? 160 : undefined}
                        useDefault={isNewModal}
                      />
                    }
                  />
                )}
                {preferences.allowTrackingOfStockByDonor && (
                  <StyledInputRow
                    label={t('label.donor')}
                    Input={
                      <DonorSearchInput
                        donorId={draft.donor?.id ?? null}
                        width={160}
                        onChange={donor => onUpdate({ donor })}
                        clearable
                      />
                    }
                  />
                )}
                <StyledInputRow
                  label={t('label.campaign')}
                  Input={
                    <CampaignOrProgramSelector
                      campaignId={draft.campaign?.id}
                      programId={draft.program?.id}
                      programOptionsOrFilter={{ filterByItemId: draft.itemId }}
                      onChange={({ campaign, program }) =>
                        onUpdate({ campaign, program })
                      }
                    />
                  }
                />
              </Grid>
            </Grid>
          </Box>
        </Grid>
      </Grid>
    </DetailContainer>
  );
};
