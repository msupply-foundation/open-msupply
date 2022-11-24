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
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../api';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';

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
  draft: StockLineRowFragment;
  onUpdate: (patch: Partial<StockLineRowFragment>) => void;
}
export const StockLineForm: FC<StockLineFormProps> = ({ draft, onUpdate }) => {
  const t = useTranslation('inventory');
  const [barcode, setBarcode] = React.useState('');

  const scanBarcode = async () => {
    // Check camera permission
    // This is just a simple example, check out the better checks below
    await BarcodeScanner.checkPermission({ force: true });

    // make background of WebView transparent
    // note: if you are using ionic this might not be enough, check below
    BarcodeScanner.hideBackground();

    const result = await BarcodeScanner.startScan(); // start scanning and wait for a result

    // if the result has content
    if (result.hasContent) {
      setBarcode(result.content ?? '');
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
              <BasicTextInput value={barcode} onChange={() => {}} />
              <IconButton
                onClick={scanBarcode}
                icon={<ScanIcon />}
                label={'Scan'}
              />
            </Box>
          }
        />
      </Grid>
    </Grid>
  );
};
