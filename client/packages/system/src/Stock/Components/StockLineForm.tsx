import React, { FC, useEffect } from 'react';
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
  PartialBy,
  ConfirmationModalState,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../api';
import { LocationSearchInput } from '../../Location/Components/LocationSearchInput';
import {
  PackVariantInput,
  usePackVariant,
  useIsPackVariantsEnabled,
} from '../..';
import { StyledInputRow } from './StyledInputRow';
import { Footer } from '../DetailView/Footer';

interface StockLineFormProps {
  draft: StockLineRowFragment;
  loading: boolean;
  onUpdate: (patch: Partial<StockLineRowFragment>) => void;
  plugins?: JSX.Element[];
  packEditable?: boolean;
  footerProps?: {
    isSaving: boolean;
    showSaveConfirmation: (
      paramPatch?:
        | Partial<PartialBy<ConfirmationModalState, 'open'>>
        | undefined
    ) => void;
    showCancelConfirmation: (
      paramPatch?:
        | Partial<PartialBy<ConfirmationModalState, 'open'>>
        | undefined
    ) => void;
    isDirty: boolean;
  };
}
export const StockLineForm: FC<StockLineFormProps> = ({
  draft,
  loading,
  onUpdate,
  plugins,
  packEditable,
  footerProps,
}) => {
  const t = useTranslation('inventory');
  const { error } = useNotification();
  const { isConnected, isEnabled, isScanning, startScan } =
    useBarcodeScannerContext();
  const supplierName = draft.supplierName
    ? draft.supplierName
    : t('message.no-supplier');
  const location = draft?.location ?? null;

  const isPackVariantsEnabled = useIsPackVariantsEnabled();
  const { asPackVariant } = usePackVariant(
    draft.itemId,
    draft.item.unitName ?? null
  );
  const packUnit = asPackVariant(draft.packSize);
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
      error(t('error.unable-to-scan', { error: e }))();
    }
  };

  useEffect(() => {
    function handleKeyDown(this: HTMLElement, ev: KeyboardEvent) {
      if (ev.ctrlKey && ev.key === 's') {
        scanBarcode();
      }
    }
    document.body.addEventListener('keydown', handleKeyDown);
    return () => document.body.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) return null;

  return (
    <DetailContainer>
      <Grid
        display="flex"
        flex={1}
        container
        paddingTop={2}
        paddingBottom={1}
        width="100%"
        flexWrap="nowrap"
        maxWidth={900}
        gap={footerProps ? 10 : undefined}
      >
        <Grid
          container
          display="flex"
          flex={1}
          flexBasis="50%"
          flexDirection="column"
          gap={1}
        >
          <StyledInputRow
            label={t('label.num-packs')}
            Input={
              <NumericTextInput
                autoFocus
                disabled={!packEditable}
                width={160}
                value={draft.totalNumberOfPacks}
                onChange={totalNumberOfPacks =>
                  onUpdate({ totalNumberOfPacks })
                }
              />
            }
          />
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
                value={DateUtils.getDateOrNull(draft.expiryDate)}
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
          {plugins}
        </Grid>
        <Grid
          container
          display="flex"
          flex={1}
          flexBasis="50%"
          flexDirection="column"
          gap={1}
        >
          {packEditable ? (
            <StyledInputRow
              label={
                isPackVariantsEnabled ? t('label.pack') : t('label.pack-size')
              }
              Input={
                <PackVariantInput
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
              label={
                isPackVariantsEnabled ? t('label.pack') : t('label.pack-size')
              }
              text={String(isPackVariantsEnabled ? packUnit : draft.packSize)}
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
              <Box display="flex" style={{ width: 162 }}>
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
        </Grid>
      </Grid>
      {footerProps && <Footer {...footerProps} />}
    </DetailContainer>
  );
};
