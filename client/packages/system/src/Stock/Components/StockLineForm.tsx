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
  usePreference,
  PreferenceKey,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../api';
import { LocationSearchInput } from '../../Location/Components/LocationSearchInput';
import { DonorSearchInput } from '../..';
import { StyledInputRow } from './StyledInputRow';
import {
  ItemVariantInput,
  PackSizeNumberInput,
  useIsItemVariantsEnabled,
} from '../../Item';
import { CampaignSelector } from './Campaign';

interface StockLineFormProps {
  draft: StockLineRowFragment;
  loading: boolean;
  onUpdate: (patch: Partial<StockLineRowFragment>) => void;
  pluginEvents: UsePluginEvents<{ isDirty: boolean }>;
  packEditable?: boolean;
  isInModal?: boolean;
}
export const StockLineForm = ({
  draft,
  loading,
  onUpdate,
  pluginEvents,
  packEditable,
  isInModal = false,
}: StockLineFormProps) => {
  const t = useTranslation();
  const { error } = useNotification();

  const { data: preferences } = usePreference(
    PreferenceKey.AllowTrackingOfStockByDonor,
    PreferenceKey.ManageVaccinesInDoses,
    PreferenceKey.ManageVvmStatusForStock
  );

  const { isConnected, isEnabled, isScanning, startScan } =
    useBarcodeScannerContext();
  const showItemVariantsInput = useIsItemVariantsEnabled();
  const { plugins } = usePluginProvider();

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

  return (
    <DetailContainer>
      <Grid
        flex={1}
        container
        paddingTop={2}
        width="100%"
        flexWrap="nowrap"
        maxWidth={900}
        gap={isInModal ? undefined : 10}
      >
        <Grid container flex={1} flexBasis="50%" flexDirection="column" gap={1}>
          <StyledInputRow
            label={t('label.pack-quantity')}
            Input={
              <NumericTextInput
                autoFocus
                disabled={!packEditable}
                width={160}
                value={
                  draft.totalNumberOfPacks
                    ? parseFloat(draft.totalNumberOfPacks.toFixed(2))
                    : 0
                }
                onChange={totalNumberOfPacks =>
                  onUpdate({ totalNumberOfPacks })
                }
              />
            }
          />
          {!packEditable && (
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
                />
              }
            />
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
          {showItemVariantsInput && (
            <StyledInputRow
              label={t('label.item-variant')}
              Input={
                <ItemVariantInput
                  itemId={draft.itemId}
                  selectedId={draft.itemVariantId ?? null}
                  width={160}
                  onChange={variant => onUpdate({ itemVariantId: variant?.id })}
                  displayDoseColumns={
                    (draft.item.isVaccine &&
                      preferences?.manageVaccinesInDoses) ??
                    false
                  }
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
                <PackSizeNumberInput
                  isDisabled={!packEditable}
                  packSize={draft.packSize}
                  itemId={draft.itemId}
                  unitName={draft.item.unitName ?? null}
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
          {draft?.item?.isVaccine && preferences?.manageVvmStatusForStock && (
            <StyledInputRow
              label={t('label.vvm-status')}
              Input={
                <BufferedTextInput
                  disabled
                  value={draft.vvmStatus?.description ?? ''}
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
          <StyledInputRow
            label={t('label.campaign')}
            Input={
              <CampaignSelector
                campaignId={draft.campaign?.id}
                onChange={campaign => onUpdate({ campaign })}
              />
            }
          />
        </Grid>
      </Grid>
    </DetailContainer>
  );
};
