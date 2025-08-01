import React, { FC } from 'react';
import { CurrencyRowFragment } from '../api';
import {
  Box,
  InputWithLabelRow,
  NumericTextInput,
  useTranslation,
} from '@openmsupply-client/common';
import { CurrencyAutocomplete } from './CurrencyAutocomplete';

interface CurrencySearchInputProps {
  value?: CurrencyRowFragment | null;
  width?: number;
  disabled?: boolean;
  onChange: (currency: CurrencyRowFragment | null) => void;
  currencyRate?: number;
}

export const CurrencySearchInput: FC<CurrencySearchInputProps> = ({
  value,
  width,
  disabled = false,
  onChange,
  currencyRate,
}) => {
  const t = useTranslation();
  const [rate, setRate] = React.useState(currencyRate);

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <InputWithLabelRow
        label={t('label.currency')}
        labelWidth="100%"
        Input={
          <CurrencyAutocomplete
            value={value}
            width={width}
            popperMinWidth={width}
            onChange={currency => {
              setRate(currency?.rate);
              onChange(currency);
            }}
            disabled={disabled}
          />
        }
      />
      <InputWithLabelRow
        label={t('heading.rate')}
        labelWidth="100%"
        Input={
          <NumericTextInput
            disabled={disabled}
            value={rate}
            sx={{
              width: `${width}px`,
            }}
            onChange={e => {
              setRate(Number(e));
              onChange({
                ...value,
                rate: e,
              } as CurrencyRowFragment);
            }}
            decimalLimit={10}
          />
        }
      />
    </Box>
  );
};
