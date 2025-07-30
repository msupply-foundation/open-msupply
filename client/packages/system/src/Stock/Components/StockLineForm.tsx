import React, { useState } from 'react';
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
  usePreference,
  PreferenceKey,
  ReasonOptionNodeType,
  QuantityUtils,
  Alert,
} from '@openmsupply-client/common';
import { DraftStockLine } from '../api';
import { LocationSearchInput } from '../../Location/Components/LocationSearchInput';
import {
  DonorSearchInput,
  ReasonOptionRowFragment,
  ReasonOptionsSearchInput,
  VVMStatusSearchInput,
} from '../..';
import { INPUT_WIDTH, StyledInputRow } from './StyledInputRow';
import { ItemVariantInput, useIsItemVariantsEnabled } from '../../Item';
import { CampaignSelector } from './Campaign';

interface StockLineFormProps {
  draft: DraftStockLine;
  loading: boolean;
  onUpdate: (patch: Partial<DraftStockLine>) => void;
  pluginEvents: UsePluginEvents<{ isDirty: boolean }>;
  packEditable?: boolean;
  isNewModal?: boolean;
  reasonOptions?: ReasonOptionRowFragment[];
}
export const StockLineForm = ({
  draft,
  loading,
  onUpdate,
  pluginEvents,
  packEditable,
  isNewModal = false,
  reasonOptions,
}: StockLineFormProps) => {
  const t = useTranslation();
  const { error } = useNotification();

  const { data: preferences } = usePreference(
    PreferenceKey.AllowTrackingOfStockByDonor,
    PreferenceKey.ManageVaccinesInDoses,
    PreferenceKey.ManageVvmStatusForStock,
    PreferenceKey.SortByVvmStatusThenExpiry,
    PreferenceKey.UseCampaigns
  );

  const { isConnected, isEnabled, isScanning, startScan } =
    useBarcodeScannerContext();
  const showItemVariantsInput = useIsItemVariantsEnabled();
  const { plugins } = usePluginProvider();

  const [invalidLocationAlert, setInvalidLocationAlert] = useState<string>('');

  const showVVMStatus =
    draft?.item?.isVaccine &&
    (preferences?.manageVvmStatusForStock ||
      preferences?.sortByVvmStatusThenExpiry);

  const supplierName = draft.supplierName
    ? draft.supplierName
    : t('message.no-supplier');
  const location = draft?.location ?? null;

  const scanBarcode = async () => {
    try {
      const result = await startScan();
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
    if (!preferences?.manageVaccinesInDoses || !draft.item.isVaccine) return {};

    const doses = QuantityUtils.packsToDoses(numPacks, draft);

    return {
      helperText: `${doses} ${t('label.doses').toLowerCase()}`,
      sx: {
        '& .MuiFormHelperText-root': {
          textAlign: 'right',
        },
      },
    };
  };

  return (
    <DetailContainer>
      <Grid
        flex={1}
        container
        paddingTop={2}
        width="100%"
        flexWrap="nowrap"
        maxWidth={900}
        gap={isNewModal ? undefined : 10}
      >
        <Grid container flex={1} flexBasis="50%" flexDirection="column" gap={1}>
          <StyledInputRow
            label={t('label.pack-quantity')}
            Input={
              <NumericTextInput
                autoFocus
                disabled={!packEditable}
                width={160}
                value={draft.totalNumberOfPacks ? draft.totalNumberOfPacks : 0}
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
                    value={parseFloat(draft.availableNumberOfPacks.toFixed(2))}
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
                defaultValue={draft.costPricePerPack}
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
                defaultValue={draft.sellPricePerPack}
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
          {isNewModal && (
            <StyledInputRow
              label={t('label.reason')}
              Input={
                <ReasonOptionsSearchInput
                  width={INPUT_WIDTH}
                  type={ReasonOptionNodeType.PositiveInventoryAdjustment}
                  value={draft.reasonOption}
                  onChange={reason => onUpdate({ reasonOption: reason })}
                  reasonOptions={reasonOptions ?? []}
                  loading={loading}
                  disabled={draft?.totalNumberOfPacks === 0}
                />
              }
            />
          )}
          {showItemVariantsInput && (
            <StyledInputRow
              label={t('label.item-variant')}
              Input={
                <ItemVariantInput
                  itemId={draft.itemId}
                  selectedId={draft.itemVariantId ?? null}
                  width={160}
                  onChange={variant => onUpdate({ itemVariantId: variant?.id })}
                />
              }
            />
          )}
          {plugins.stockLine?.editViewField.map((Plugin, index) => (
            <Plugin key={index} stockLine={draft} events={pluginEvents} />
          ))}
        </Grid>
        <Grid container flex={1} flexBasis="50%" flexDirection="column" gap={1}>
          {packEditable ? (
            <StyledInputRow
              label={t('label.pack-size')}
              Input={
                <NumericTextInput
                  disabled={!packEditable}
                  width={160}
                  value={draft.packSize ?? 1}
                  onChange={packSize => onUpdate({ packSize })}
                />
              }
            />
          ) : (
            <TextWithLabelRow
              label={t('label.pack-size')}
              text={String(draft.packSize)}
              textProps={{ textAlign: 'end' }}
            />
          )}
          <StyledInputRow
            label={t('label.on-hold')}
            Input={
              <Checkbox
                checked={draft.onHold}
                onChange={(_, onHold) => onUpdate({ onHold })}
              />
            }
          />
          {invalidLocationAlert && (
            <Alert severity="warning">{invalidLocationAlert}</Alert>
          )}
          <StyledInputRow
            label={t('label.location')}
            Input={
              <LocationSearchInput
                autoFocus={false}
                disabled={false}
                selectedLocation={location}
                width={160}
                onChange={location => {
                  onUpdate({ location, locationId: location?.id });
                }}
                restrictedToLocationTypeId={draft.item.restrictedLocationTypeId}
                onInvalidLocation={(_invalid, message) =>
                  setInvalidLocationAlert(message)
                }
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
                    title={isConnected ? '' : t('error.scanner-not-connected')}
                  >
                    <Box>
                      <IconButton
                        disabled={isScanning || !isConnected}
                        onClick={scanBarcode}
                        icon={
                          isScanning ? (
                            <CircularProgress size={20} color="secondary" />
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
                  useDefault
                />
              }
            />
          )}
          {preferences?.allowTrackingOfStockByDonor && (
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
          {preferences?.useCampaigns && (
            <StyledInputRow
              label={t('label.campaign')}
              Input={
                <CampaignSelector
                  campaignId={draft.campaign?.id}
                  onChange={campaign => onUpdate({ campaign })}
                />
              }
            />
          )}
        </Grid>
      </Grid>
    </DetailContainer>
  );
};
