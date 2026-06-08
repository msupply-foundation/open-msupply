import React, { FC } from 'react';
import RCInput, {
  CurrencyInputProps as RCInputProps,
} from 'react-currency-input-field';
import { FormControl, InputLabel, OutlinedInput } from '@mui/material';
import { Currencies, useCurrency, useFormatNumber } from '@common/intl';
import { NumUtils } from '@common/utils';
import { useBufferState } from '@common/hooks';

interface CurrencyInputProps extends Omit<RCInputProps, 'ref'> {
  onChangeNumber: (value: number) => void;
  maxWidth?: number | string;
  currencyCode?: Currencies;
  label?: string;
}

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
  label,
  ...restOfProps
}) => {
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

  return (
    <FormControl size="small" disabled={disabled} sx={{ maxWidth, width }}>
      {label && <InputLabel color="primary">{label}</InputLabel>}
      <OutlinedInput
        label={label}
        disabled={disabled}
        size="small"
        color="primary"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inputComponent={RCInput as any}
        inputProps={{
          value: buffer,
          onValueChange: (_v: unknown, _e: unknown, values: { value: string; float: number | null } | undefined) => {
            setBuffer(values?.value);
            if (
              !values?.value.endsWith(options.decimal) &&
              !values?.value.endsWith('0')
            ) {
              onChangeNumber(values?.float ?? 0);
            }
          },
          onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select(),
          onBlur: () => {
            const finalValue = buffer ? Number(buffer) : 0;
            setBuffer(
              format(finalValue, {
                minimumFractionDigits: precision,
                useGrouping: false,
              })
            );
            onChangeNumber(finalValue);
          },
          allowNegativeValue,
          prefix,
          suffix,
          decimalSeparator: options.decimal,
          groupSeparator: options.separator,
          decimalsLimit: precision,
          allowDecimals,
          decimalScale: allowDecimals ? precision : undefined,
          style: { textAlign: 'right' as const },
          ...restOfProps,
        }}
        sx={{
          backgroundColor: disabled ? 'rgba(0, 0, 0, 0.04)' : '#ffffff',
        }}
      />
    </FormControl>
  );
};
