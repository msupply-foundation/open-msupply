import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import { StandardTextFieldProps } from '@common/components';
import { BasicTextInput } from './BasicTextInput';
import { NumUtils, RegexUtils } from '@common/utils';
import { useFormatNumber, useCurrency } from '@common/intl';

export interface NumericInputProps {
  width?: number | string;
  defaultValue?: number;
  allowNegative?: boolean;
  min?: number;
  max?: number;
  decimalLimit?: number;
  decimalMin?: number;
  step?: number;
  multiplier?: number;
  value?: number | undefined;
  focusOnRender?: boolean;
  noFormatting?: boolean;
}

export type NumericTextInputProps = NumericInputProps &
  Omit<StandardTextFieldProps, 'onChange'> & {
    onChange?: (value: number | undefined) => void;
  };

export const DEFAULT_NUMERIC_TEXT_INPUT_WIDTH = 75;

export const NumericTextInput: FC<NumericTextInputProps> = React.forwardRef(
  (
    {
      sx,
      InputProps,
      width = DEFAULT_NUMERIC_TEXT_INPUT_WIDTH,
      onChange = () => {},
      defaultValue,
      allowNegative,
      min = allowNegative ? -NumUtils.MAX_SAFE_API_INTEGER : 0,
      max = NumUtils.MAX_SAFE_API_INTEGER,
      decimalLimit = 0,
      decimalMin,
      step = 1,
      multiplier = 10,
      value,
      noFormatting = false,
      ...props
    },
    ref
  ) => {
    const { format, parse } = useFormatNumber();
    const {
      options: { separator, decimal },
    } = useCurrency();
    const formatValue = useCallback(
      (val: number | undefined) =>
        noFormatting
          ? val === undefined
            ? ''
            : String(val)
          : format(val, { minimumFractionDigits: decimalMin }),
      [decimalMin, format, noFormatting]
    );
    const [isDirty, setIsDirty] = useState(false);
    const [textValue, setTextValue] = useState(
      formatValue(value ?? defaultValue)
    );

    const isFirstRender = useRef(true);

    const isInputIncomplete = useCallback(
      (value: string) => {
        if (value === '-') return true;

        return new RegExp(
          // Checks for a trailing `.` or a `0` (not necessarily immediately)
          // after a `.`
          `^\\d*${RegexUtils.escapeChars(
            decimal
          )}$|\\d*${RegexUtils.escapeChars(decimal)}\\d*0$`
        ).test(value);
      },
      [decimal]
    );

    useEffect(() => {
      if (isFirstRender.current) {
        // On first render, ensure number value is set from defaultValue prop
        if (textValue && value === undefined) onChange(parse(textValue));
        isFirstRender.current = false;
        return;
      }

      // On subsequent renders, keep textValue up to date with value if value
      // has changed externally
      if (
        parse(textValue ?? '') !== value &&
        !isInputIncomplete(textValue ?? '')
      )
        setTextValue(formatValue(value));
    }, [
      value,
      textValue,
      format,
      parse,
      onChange,
      isInputIncomplete,
      formatValue,
    ]);

    const inputRegex = new RegExp(
      `^-?\\d*${RegexUtils.escapeChars(decimal)}?\\d*$`
    );

    return (
      <BasicTextInput
        ref={ref}
        sx={{
          '& .MuiInput-input': { textAlign: 'right', width: `${width}px` },
          ...sx,
        }}
        inputMode="numeric"
        InputProps={InputProps}
        onChange={e => {
          if (!isDirty) setIsDirty(true);

          const input = e.target.value
            // Remove separators
            .replace(new RegExp(`\\${separator}`, 'g'), '')
            // Remove negative if not allowed
            .replace(min < 0 ? '' : '-', '')
            // Remove decimal if not allowed
            .replace(decimalLimit === 0 ? decimal : '', '');

          if (input === '') {
            setTextValue(''); // For removing single "."
            onChange(undefined);
            return;
          }

          // Prevent illegal characters from being entered
          if (inputRegex.test(input)) setTextValue(input);
          else return;

          if (isInputIncomplete(input)) return;

          const parsed = parse(input);

          if (Number.isNaN(parsed)) return;

          const constrained = constrain(parsed, decimalLimit, min, max);
          setTextValue(
            noFormatting ? String(constrained) : format(constrained)
          );
          onChange(constrained);
        }}
        onKeyDown={e => {
          if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

          e.preventDefault();
          const change =
            (e.key === 'ArrowUp' ? step : -step) *
            (e.shiftKey ? multiplier : 1);

          const newNum = constrain(
            (value ?? Math.max(min, 0)) + change,
            decimalLimit,
            min,
            max
          );
          setTextValue(formatValue(newNum));
          onChange(newNum);
        }}
        onBlur={() => {
          if (isDirty) {
            const parsed = parse(textValue ?? '');
            const val = Number.isNaN(parsed) ? defaultValue : parsed;

            onChange(val);
            setTextValue(formatValue(val));
          }
        }}
        onFocus={e => e.target.select()}
        {...props}
        value={textValue}
      />
    );
  }
);

const constrain = (value: number, decimals: number, min: number, max: number) =>
  NumUtils.constrain(NumUtils.round(value, decimals), min, max);
