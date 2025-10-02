import React, { FC } from 'react';
import { styled } from '@mui/material/styles';
import RCInput, {
  CurrencyInputProps as RCInputProps,
} from 'react-currency-input-field';
import { useCurrency } from '@common/intl';
import { NumUtils } from '@common/utils';
import { useBufferState } from '@common/hooks';

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
  const val = value !== undefined ? value : defaultValue;
  const valueAsNumber = Number.isNaN(Number(val)) ? 0 : Number(val);
  const { options } = useCurrency();

  const [buffer, setBuffer] = useBufferState<string | number | undefined>(
    NumUtils.round(valueAsNumber, options.precision)
  );

  const isSymbolLast = options.pattern.endsWith('!');
  const prefix = !isSymbolLast ? options.symbol : '';
  const suffix = isSymbolLast ? options.symbol : '';

  return (
    <StyledCurrencyInput
      sx={{
        maxWidth,
        backgroundColor: theme =>
          disabled
            ? theme.palette.background.input.disabled
            : theme.palette.background.input.main,
        '&:hover': {
          borderBottom: disabled ? 'none' : undefined,
        },
        color: disabled ? theme => theme.palette.text.disabled : undefined,
        width,
      }}
      value={buffer}
      onValueChange={(_v, _e, values) => {
        setBuffer(values?.value);
        if (!values?.value.endsWith(options.decimal)) {
          onChangeNumber(values?.float ?? 0);
        }
      }}
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
