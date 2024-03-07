import React, { FC } from 'react';
import { styled } from '@mui/material/styles';
import RCInput, {
  CurrencyInputProps as RCInputProps,
} from 'react-currency-input-field';
import { useCurrency } from '@common/intl';

interface CurrencyInputProps extends RCInputProps {
  onChangeNumber: (value: number) => void;
  maxWidth?: number | string;
}

// TODO: It would be nice if we were to just use the BasicTextInput or
// another MUI text input rather than trying to recreate the style so that
// it could stay in sync with style updated.
const StyledCurrencyInput = styled(RCInput)(({ theme }) => ({
  fontFamily: theme.typography.fontFamily,
  height: 34.125,
  borderRadius: '8px',
  padding: '4px 8px',
  textAlign: 'right',
  border: 'none',
  '&:focus:not(hover)': {
    outline: 'none',
    borderBottom: `2px solid ${theme.palette.secondary.main}`,
    borderRadius: '8px 8px 0px 0px',
  },
  '&:hover': {
    borderBottom: `2px solid ${theme.palette.gray.main}`,
    borderRadius: '8px 8px 0px 0px',
  },
}));

export const CurrencyInput: FC<CurrencyInputProps> = ({
  allowNegativeValue = false,
  allowDecimals = true,
  defaultValue,
  onChangeNumber,
  maxWidth,
  value,
  ...restOfProps
}) => {
  const { c, options, language } = useCurrency();
  const prefix = language !== 'fr' ? options.symbol : '';
  const suffix = language === 'fr' ? options.symbol : '';
  const valueAsNumber = Number.isNaN(value) ? 0 : Number(value);

  return (
    <StyledCurrencyInput
      sx={{
        maxWidth,
        backgroundColor: theme =>
          restOfProps.disabled
            ? theme.palette.background.toolbar
            : theme.palette.background.menu,
      }}
      defaultValue={defaultValue ?? valueAsNumber}
      onValueChange={newValue => onChangeNumber(c(newValue || '').value)}
      onFocus={e => e.target.select()}
      allowNegativeValue={allowNegativeValue}
      prefix={prefix}
      suffix={suffix}
      decimalSeparator={options.decimal}
      groupSeparator={options.separator}
      decimalsLimit={options.precision}
      allowDecimals={allowDecimals}
      decimalScale={allowDecimals ? options.precision : undefined}
      {...restOfProps}
    />
  );
};
