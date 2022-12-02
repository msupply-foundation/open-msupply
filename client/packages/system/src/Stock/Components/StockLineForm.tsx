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
  draft: StockLineRowFragment;
  onUpdate: (patch: Partial<StockLineRowFragment>) => void;
}
export const StockLineForm: FC<StockLineFormProps> = ({ draft, onUpdate }) => {
  const t = useTranslation('inventory');

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
      </Grid>
    </Grid>
  );
};
