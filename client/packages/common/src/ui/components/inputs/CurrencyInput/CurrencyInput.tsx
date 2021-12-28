import React, { FC, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import RCInput, {
  CurrencyInputProps as RCInputProps,
} from 'react-currency-input-field';

interface CurrencyInputProps extends RCInputProps {
  onChangeNumber: (value: number) => void;
  maxWidth?: number;
}

// TODO: It would be nice if we were to just use the BasicTextInput or
// another MUI text input rather than trying to recreate the style so that
// it could stay in sync with style updated.
const StyledCurrencyInput = styled(RCInput)(({ theme }) => ({
  fontFamily: theme.typography.fontFamily,
  height: 34.125,
  borderRadius: '8px',
  padding: '4px 8px',
  backgroundColor: '#f2f2f5',
  textAlign: 'right',
  border: 'none',
  '&:focus': {
    outline: 'none',
  },
}));

// TODO: I think the implementation of this could be swapped out by making a
// headless component that uses something like currency.js in a custom hook
// to manage the currency value. Then you could use whatever input component
// you liked. That would just take a little more time than I have right now!
export const CurrencyInput: FC<CurrencyInputProps> = ({
  allowNegativeValue = false,
  prefix = '$',
  decimalSeparator = '.',
  decimalsLimit = 2,
  allowDecimals = true,
  decimalScale = 2,
  value = 0,
  onChangeNumber,
  maxWidth,
  ...restOfProps
}) => {
  // Buffer the internal input value so we can account for the decimal separator
  // which, when input will result in the input being NaN (e.g. '42.') when cast
  // to a number. In this case, we want to keep the value as '42.' in the input
  // but not persisted. Though, whenever I have an uncontrolled component I
  // generally will always regret it, so sync the passed value up with the buffer.
  const [buffer, setBuffer] = React.useState<string | undefined>(String(value));
  useEffect(() => {
    if (value !== Number(buffer)) {
      setBuffer(String(value));
    }
  }, [value]);

  // Call the onChangeNumber prop when the buffer changes to a valid number, which
  // is essentially in every case except when the number ends in a decimal. If the user
  // loses focus when the buffer is in this invalid state, the currency input will
  // append two zeros so will always result in a valid number.
  useEffect(() => {
    // circuit break when the value is equal to the buffer - we don't need to do anything.
    if (Number(buffer) === value) return;

    if (buffer == null) {
      return onChangeNumber(0);
    }
    if (!Number.isNaN(buffer)) {
      return onChangeNumber(Number(buffer));
    }
  }, [buffer, value]);

  return (
    <StyledCurrencyInput
      sx={{ maxWidth }}
      value={buffer}
      onValueChange={newValue => {
        setBuffer(newValue);
      }}
      allowNegativeValue={allowNegativeValue}
      prefix={prefix}
      decimalSeparator={decimalSeparator}
      decimalsLimit={decimalsLimit}
      allowDecimals={allowDecimals}
      decimalScale={decimalScale}
      transformRawValue={value => value.replace(/[^0-9.]/g, '')}
      {...restOfProps}
    />
  );
};
