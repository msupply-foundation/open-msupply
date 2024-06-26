/**
 * PLEASE READ AND UNDERSTAND THE FOLLOWING BEFORE MAKING ANY CHANGES TO THIS
 * COMPONENT:
 *
 * A general component for numeric input. Provides a wrapper around
 * <BasicTextInput> to replicate (and extend) the functionality of using a text
 * input without the `type="number"` attribute. We want to avoid this attribute
 * as it causes numerous problems, as outlined here:
 * https://stackoverflow.blog/2022/12/26/why-the-number-input-is-the-worst-input/
 *
 * And is officially recommended to avoid by Material-UI:
 * https://mui.com/material-ui/react-text-field/#type-quot-number-quot
 *
 * A useful numeric input component must meet several requirements:
 * - don't allow invalid (i.e. letters) input
 * - allow *some* invalid input if it's typed as part of a valid number, (e.g. a
 *   single `-` symbol to start inputting negative numbers, or a decimal point
 *   without the following digits), but NOT send invalid values in its
 *   `onChange` event
 * - allow the user to clear their input, even in a controlled component (so the
 *   value will be `undefined`)
 * - handle minimum and maximum value restrictions
 * - handle maximum precision restrictions (e.g. integers only, or maximum of
 *   2d.p.)
 * - handle minimum precision restrictions (e.g. if 2 d.p required, then an
 *   input of "4" will be re-formatted as "4.00")
 * - handle the fact that different locales use different symbols for
 *   "negative", "decimal point" and "separators"
 * - format large numbers (e.g. 10000 => 10,000) for easier readability
 * - parse formatted input (e.g. 10,000) into a meaningful number value
 * - NOT format large numbers when explicitly specified
 * - allow user to increment/decrement numbers using their keyboard
 * - respond to external value changes and update its value and text
 *   representation accordingly
 *
 * To meet all these requirements results in fairly complex component, which
 * makes it somewhat fragile and hard to fully understand some of the logic. So
 * here is a basic overview of the internal logic it follows:
 *
 * - The `value` (the actual number) is managed in the calling component, and
 *   this component just updates it on (valid) onChange or onBlur events. But
 *   internally we store a `textValue` state, which is the string representation
 *   of the current `value`, and what is actually displayed in the UI. It's
 *   important to note that the `textValue` can be an *incomplete* entry (e.g.
 *   "1." or "-") whereas the actual `value` is only updated when there is a
 *   valid "complete" number that can be parsed from the user input.
 *
 * - Because the user can erase their input (`textValue = ''`), the number value
 *   is set to `undefined`. Any component that uses this component must be able
 *   to handle an `undefined` value as its `onChange` input.
 *
 * - on `onChange` events, the following internal processing is applied:
 *   - strip any "separator" characters (e.g. "," in English) - these are valid
 *     input, but not parseable as number (they'll be put back in onBlur).
 *   - strip negative or decimal characters if not allowed (based on min/max and
 *     precision props)
 *   - if what remains passes a comparison against a regex (for valid number
 *     input), we set this as the current `textValue`. If not, do nothing and
 *     return, which prevents any invalid characters from being input at all.
 *   - check if what remains is valid but "incomplete" (i.e a lone "-", decimal
 *     or trailing 0) and return if so -- this means the `textValue` correctly
 *     displays the user input, but not yet parsed as a number.
 *   - if "complete", attempt to parse the text as a number and update the
 *     `value` by calling the supplied `onChange` method (from props)
 *   - a `useEffect` hook responds to changes in `value`/`textValue` and, in the
 *     event they represent different numbers, updates the `textValue`
 *     accordingly -- this would mean that the `value` has been changed
 *     externally so the UI should be updated to reflect this.
 *
 * - onKeyDown events:
 *   - if the user typed an up or down arrow key, increment or decrement the
 *     number according to the `step` and `multiplier` props, and format
 *     accordingly (limited by min/max)
 *
 * - onBlur events:
 *   - when the user exits the input, it's possible that the `textValue` is
 *     "incomplete" (as detailed above), or should display a certain number of
 *     decimals, so we format the current value according to these rules, which
 *     ensures the UI will always display a correctly formatted version of the
 *     current number value.
 *   - this only happens if the user has made any changes to the starting value
 *     (checking against `isDirty`), which means it's possible for the user to
 *     click into a number input and exit it without triggering *any* `onChange`
 *     calls to the parent, which can prevent unnecessary actions being called
 *     that should only occur on *actual* changes.
 *
 * - the `format` methods:
 *   - there are two different versions of the `format` function used. The one
 *     called on `onChange` events doesn't add additional decimal padding (cos
 *     that would be annoying as you were typing), whereas the one called for
 *     `onBlur` and `onKeyDown` events *does* add any specified decimal padding.
 *
 * See prop definitions and inline comments for further detail.
 *
 * There is a test suite for this component in `NumericTextInput.test.tsx`.
 * Please ensure the tests all pass after any changes are made in here, and feel
 * free to add more test cases to account for additional use cases.
 *
 * There are also several example inputs in the storybook (TextInputs ->
 * Numeric), so please check these all behave as expected as well.
 */

import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import { BasicTextInput, BasicTextInputProps } from './BasicTextInput';
import { NumUtils, RegexUtils, UNDEFINED_STRING_VALUE } from '@common/utils';
import { useFormatNumber, useCurrency } from '@common/intl';
import { InputAdornment } from '@common/components';

export interface NumericInputProps {
  /**
   * Width of the input in pixels or other CSS value. Default 75px
   */
  width?: number | string;
  /**
   * Set an initial value for the input. Will be overridden by an externally
   * initialised `value`
   */
  defaultValue?: number;
  /** If `true`, negative numbers can be entered. A shorthand for `min` that
   * doesn't require a specific value. Default `false`
   */
  allowNegative?: boolean;
  /**
   * Min value, default -999999999
   */
  min?: number;
  /**
   * Min value, default 999999999
   */
  max?: number;
  /**
   * Input will be restricted to this many decimal places. Default 0, so only
   * integers are accepted unless explicitly specified
   */
  decimalLimit?: number;
  /**
   * Input will be padded with 0s if user doesn't enter up to this many decimal
   * places. Useful for things like currency values where "1" should be
   * displayed as "1.00".
   */
  decimalMin?: number;
  /**
   * When using the up/down arrow keys, the number will be
   * incremented/decremented in units of this size. Default 1
   */
  step?: number;
  /**
   * When using up/down arrow keys in conjunction with "Shift", the above `step`
   * value is multiplied by this value. Default 10
   */
  multiplier?: number;
  /**
   * The actual number value, passed down from calling component
   */
  value?: number | undefined;
  /**
   * If `true`, no additional localised formatting will be applied. e.g. the
   * input `1234` *won't* be displayed as `1,234`.
   */
  noFormatting?: boolean;

  /**
   * This component can also take any props used by `BasicTextInput`, or its
   * child, Mui's `TextField` -- they will be passed through unmodified.
   */
}

export type NumericTextInputProps = NumericInputProps &
  Omit<BasicTextInputProps, 'onChange'> & {
    onChange?: (value: number | undefined) => void;
    endAdornment?: string;
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
      fullWidth,
      endAdornment,
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
        if (value === UNDEFINED_STRING_VALUE) return true;

        return new RegExp(
          // Checks for a trailing `.` or a `0` (not necessarily immediately)
          // after a `.`
          `^-?\\d*${RegexUtils.escapeChars(
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
          '& .MuiInput-input': {
            textAlign: 'right',
            width: fullWidth ? undefined : `${width}px`,
          },
          ...sx,
        }}
        inputMode="numeric"
        InputProps={{
          endAdornment: endAdornment ? (
            <InputAdornment position="end" sx={{ paddingBottom: '2px' }}>
              {endAdornment}
            </InputAdornment>
          ) : undefined,
          ...InputProps,
        }}
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
            // This onChange shouldn't be necessary here -- the component
            // behaves as expected without it. However, removing it causes some
            // of the tests fail, so 🤷‍♂️
            onChange(val);
            setTextValue(formatValue(val));
          }
        }}
        onFocus={e => e.target.select()}
        fullWidth={fullWidth}
        {...props}
        value={textValue}
      />
    );
  }
);

const constrain = (value: number, decimals: number, min: number, max: number) =>
  NumUtils.constrain(NumUtils.round(value, decimals), min, max);
