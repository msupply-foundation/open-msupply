import React, { FC } from 'react';
import { styled } from '@mui/material/styles';
import { Currencies, useCurrency, useFormatNumber } from '@common/intl';
import { NumUtils } from '@common/utils';
import { useBufferState } from '@common/hooks';
import { useTheme } from '@mui/material';

export interface CurrencyInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'defaultValue' | 'onChange' | 'width'
  > {
  onChangeNumber: (value: number) => void;
  maxWidth?: number | string;
  currencyCode?: Currencies;
  value?: number | string;
  defaultValue?: number | string;
  allowNegativeValue?: boolean;
  allowDecimals?: boolean;
  decimalsLimit?: number;
  width?: number | string;
}

const StyledInput = styled('input')(({ theme }) => ({
  fontFamily: theme.typography.fontFamily,
  fontSize: theme.typography.fontSize,
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

/** Parse a formatted currency string back to a plain numeric string */
const parseRawValue = (
  displayValue: string,
  decimalSep: string,
  groupSep: string,
  prefix: string,
  suffix: string
): string => {
  let raw = displayValue;
  if (prefix) raw = raw.split(prefix).join('');
  if (suffix) raw = raw.split(prefix).join('');
  if (groupSep) raw = raw.split(groupSep).join('');
  // Normalise decimal separator to '.'
  if (decimalSep !== '.') raw = raw.replace(decimalSep, '.');
  return raw.trim();
};

export const CurrencyInput: FC<CurrencyInputProps> = ({
  allowNegativeValue = false,
  allowDecimals = true,
  defaultValue,
  onChangeNumber,
  maxWidth,
  value,
  disabled,
  width,
  currencyCode,
  decimalsLimit: decimalsLimitProp,
  style,
  ...restOfProps
}) => {
  const theme = useTheme();
  const val = value !== undefined ? value : defaultValue;
  const valueAsNumber = Number.isNaN(Number(val)) ? 0 : Number(val);
  const { options } = useCurrency(currencyCode);

  const precision = decimalsLimitProp ?? options.precision;
  const { format } = useFormatNumber();

  const [buffer, setBuffer] = useBufferState<string | number | undefined>(
    NumUtils.round(valueAsNumber, precision)
  );

  const isSymbolLast = options.pattern.endsWith('!');
  const prefix = !isSymbolLast ? options.symbol : '';
  const suffix = isSymbolLast ? options.symbol : '';

  const formatForDisplay = (num: number) =>
    format(num, {
      minimumFractionDigits: precision,
      useGrouping: false,
    });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const raw = parseRawValue(
      rawInput,
      options.decimal,
      options.separator,
      prefix,
      suffix
    );

    if (!allowNegativeValue && raw.startsWith('-')) return;
    if (raw === '' || raw === '-') {
      setBuffer(rawInput);
      return;
    }

    const normalised = raw.replace(options.decimal, '.');
    const numericRegex = allowDecimals ? /^-?\d*\.?\d*$/ : /^-?\d*$/;
    if (!numericRegex.test(normalised)) return;

    setBuffer(rawInput);

    // Don't fire callback for intermediate states (e.g. "2." or "2.0")
    if (!normalised.endsWith('.') && !normalised.endsWith('0')) {
      const parsed = parseFloat(normalised);
      if (!Number.isNaN(parsed)) onChangeNumber(parsed);
    }
  };

  const handleBlur = () => {
    const raw = parseRawValue(
      String(buffer ?? ''),
      options.decimal,
      options.separator,
      prefix,
      suffix
    );
    const finalValue = raw ? parseFloat(raw) : 0;
    const safeValue = Number.isNaN(finalValue) ? 0 : finalValue;
    setBuffer(formatForDisplay(safeValue));
    onChangeNumber(safeValue);
  };

  const bgColor = disabled
    ? theme.palette.background.input.disabled
    : theme.palette.background.input.main;

  return (
    <StyledInput
      type="text"
      inputMode="decimal"
      value={buffer ?? ''}
      onChange={handleChange}
      onFocus={e => e.target.select()}
      onBlur={handleBlur}
      disabled={disabled}
      style={{
        maxWidth,
        width,
        backgroundColor: bgColor,
        color: disabled ? theme.palette.text.disabled : undefined,
        ...style,
      }}
      {...restOfProps}
    />
  );
};
