import React, { FC } from 'react';
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
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../api';

const StyledInputRow = ({ label, Input }: InputWithLabelRowProps) => (
  <InputWithLabelRow
    label={label}
    Input={Input}
    labelProps={{ sx: { textAlign: 'end' } }}
    labelWidth="100px"
    sx={{
      justifyContent: 'space-between',
      '.MuiFormControl-root > .MuiInput-root, > input': {
        maxWidth: '120px',
      },
    }}
  />
);
interface StockLineFormProps {
  draft: StockLineRowFragment & { barcode?: string };
  onUpdate: (
    patch: Partial<StockLineRowFragment & { barcode?: string }>
  ) => void;
}
export const StockLineForm: FC<StockLineFormProps> = ({ draft, onUpdate }) => {
  const t = useTranslation('inventory');
  const { hasBarcodeScanner, isScanning, startScan } =
    useBarcodeScannerContext();

  const scanBarcode = async () => {
    const result = await startScan();
    if (result.hasContent) {
      const { content, gs1 } = result;
      const gtin = gs1?.parsedCodeItems?.find(item => item.ai === '01')
        ?.data as string;
      const batch = gs1?.parsedCodeItems?.find(item => item.ai === '10')
        ?.data as string;
      const expiry = gs1?.parsedCodeItems.find(item => item.ai === '17')
        ?.data as Date;
      const barcode = gtin ?? content;
      const draft = {
        barcode,
        batch,
        expiryDate: expiry ? Formatter.naiveDate(expiry) : undefined,
      };

      onUpdate(draft);
    }
  };

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
          label={t('label.barcode')}
          Input={
            <Box>
              <BasicTextInput value={draft.barcode ?? ''} onChange={() => {}} />
              {hasBarcodeScanner && (
                <IconButton
                  disabled={isScanning}
                  onClick={scanBarcode}
                  icon={
                    isScanning ? (
                      <CircularProgress size={20} color="secondary" />
                    ) : (
                      <ScanIcon />
                    )
                  }
                  label={'Scan'}
                />
              )}
            </Box>
          }
        />
      </Grid>
    </Grid>
  );
};
