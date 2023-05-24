import React, { FC, useEffect } from 'react';
import {
  Checkbox,
  Grid,
  DateUtils,
  Formatter,
  TextWithLabelRow,
  InputWithLabelRow,
  BasicTextInput,
  CurrencyInput,
  InputWithLabelRowProps,
  ExpiryDateInput,
  useTranslation,
  Box,
  IconButton,
  ScanIcon,
  useBarcodeScannerContext,
  CircularProgress,
  useNotification,
  Tooltip,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../api';
import { LocationSearchInput } from '../../Location/Components/LocationSearchInput';

const StyledInputRow = ({ label, Input }: InputWithLabelRowProps) => (
  <InputWithLabelRow
    label={label}
    Input={Input}
    labelProps={{ sx: { textAlign: 'end' } }}
    labelWidth="100px"
    sx={{
      justifyContent: 'space-between',
      '.MuiFormControl-root > .MuiInput-root, > input': {
        maxWidth: '160px',
      },
    }}
  />
);
interface StockLineFormProps {
  draft: StockLineRowFragment;
  onUpdate: (patch: Partial<StockLineRowFragment>) => void;
}
export const StockLineForm: FC<StockLineFormProps> = ({ draft, onUpdate }) => {
  const t = useTranslation('inventory');
  const { error } = useNotification();
  const { isConnected, isEnabled, isScanning, startScan } =
    useBarcodeScannerContext();
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

  return (
    <Grid
      display="flex"
      flex={1}
      container
      paddingTop={2}
      paddingBottom={2}
      width="100%"
    >
      <Grid
        container
        display="flex"
        flex={1}
        flexBasis="50%"
        flexDirection="column"
        gap={1}
      >
        <TextWithLabelRow
          label={t('label.pack-quantity')}
          text={String(draft.totalNumberOfPacks)}
          textProps={{ textAlign: 'end' }}
        />
        <StyledInputRow
          label={t('label.cost-price')}
          Input={
            <CurrencyInput
              autoFocus
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
            <BasicTextInput
              value={draft.batch ?? ''}
              onChange={e => onUpdate({ batch: e.target.value })}
            />
          }
        />
      </Grid>
      <Grid
        container
        display="flex"
        flex={1}
        flexBasis="50%"
        flexDirection="column"
        gap={1}
      >
        <TextWithLabelRow
          label={t('label.pack-size')}
          text={String(draft.packSize)}
          textProps={{ textAlign: 'end' }}
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
              value={location}
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
              <BasicTextInput
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
  );
};
