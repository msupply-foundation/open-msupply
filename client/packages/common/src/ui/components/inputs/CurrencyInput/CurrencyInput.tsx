import React, { FC } from 'react';
import { styled } from '@mui/material/styles';
import RCInput, {
  CurrencyInputProps as RCInputProps,
} from 'react-currency-input-field';
import { useCurrency } from '@common/intl';
import { NumUtils } from '@common/utils';

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
  disabled,
  width,
  ...restOfProps
}) => {
  const { c, options } = useCurrency();
  const isSymbolLast = options.pattern.endsWith('!');
  const prefix = !isSymbolLast ? options.symbol : '';
  const suffix = isSymbolLast ? options.symbol : '';
  const defaultValueAsNumber = Number.isNaN(Number(defaultValue))
    ? undefined
    : Number(defaultValue);
  const valueAsNumber = Number.isNaN(value) ? 0 : Number(value);

  return (
    <StyledCurrencyInput
      sx={{
        maxWidth,
        backgroundColor: theme =>
          disabled
            ? theme.palette.background.toolbar
            : theme.palette.background.menu,
        '&:hover': {
          borderBottom: disabled ? 'none' : undefined,
        },
        color: disabled ? theme => theme.palette.text.disabled : undefined,
        width,
      }}
      defaultValue={NumUtils.round(
        valueAsNumber ?? defaultValueAsNumber,
        options.precision
      )}
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
      disabled={disabled}
      {...restOfProps}
    />
  );
};
