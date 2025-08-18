import React from 'react';
import {
  BasicTextInput,
  Box,
  InputWithLabelRow,
  LocaleKey,
  NumericTextInput,
  NumUtils,
  TypedTFunction,
  useMediaQuery,
} from '@openmsupply-client/common';

interface NumericInputProps {
  onChange?: (value?: number) => void;
  max?: number;
  decimalLimit?: number;
  endAdornment?: string;
}

export const createNumericInput =
  (t: TypedTFunction<LocaleKey>, disabled: boolean) =>
  (
    label: LocaleKey,
    value: number | null | undefined,
    options: NumericInputProps = {}
  ) => {
    const { onChange, max, decimalLimit, endAdornment } = options;

    return (
      <NumInputRow
        disabled={disabled}
        label={t(label)}
        value={value ?? 0}
        onChange={onChange}
        max={max}
        decimalLimit={decimalLimit}
        endAdornment={endAdornment}
      />
    );
  };

interface NumInputRowProps {
  label: string;
  value: number;
  onChange?: (value?: number) => void;
  disabled: boolean;
  max?: number;
  decimalLimit?: number;
  endAdornment?: string;
}

export const NumInputRow = ({
  label,
  value,
  onChange,
  disabled,
  max,
  decimalLimit,
  endAdornment,
}: NumInputRowProps) => {
  const isVerticalScreen = useMediaQuery('(max-width:800px)');

  const roundedValue = NumUtils.round(value, 2);

  const handleChange = (newValue?: number) => {
    if (!onChange || newValue === roundedValue) return;

    const value = newValue === undefined ? 0 : newValue;
    onChange(value);
  };

  return (
    <Box
      sx={{
        marginBottom: 1,
        px: 1,
        flex: 1,
      }}
    >
      <InputWithLabelRow
        Input={
          <NumericTextInput
            fullWidth
            sx={{
              '& .MuiInputBase-input': {
                backgroundColor: theme =>
                  disabled
                    ? theme.palette.background.toolbar
                    : theme.palette.background.white,
              },
            }}
            slotProps={{
              input: {
                sx: {
                  boxShadow: theme => (!disabled ? theme.shadows[2] : 'none'),
                  background: theme =>
                    disabled
                      ? theme.palette.background.toolbar
                      : theme.palette.background.white,
                },
              },
            }}
            min={0}
            value={roundedValue}
            onChange={handleChange}
            disabled={disabled}
            max={max}
            decimalLimit={decimalLimit ?? 0}
            endAdornment={endAdornment}
          />
        }
        label={label}
        labelProps={{
          sx: {
            width: {
              xs: '100%',
            },
          },
        }}
        sx={{
          justifyContent: 'space-between',
          flexDirection: {
            xs: isVerticalScreen ? 'column' : 'row',
            md: 'row',
          },
          alignItems: { xs: 'flex-start', md: 'center' },
        }}
      />
    </Box>
  );
};

export const createTextInput =
  (t: TypedTFunction<LocaleKey>, disabled: boolean) =>
  (
    label: LocaleKey,
    value: string | null | undefined,
    onChange?: (value?: string) => void
  ) => {
    return (
      <TextInput
        disabled={disabled}
        label={t(label)}
        value={value ?? ''}
        onChange={onChange}
      />
    );
  };

interface TextInputProps {
  label: string;
  value: string;
  onChange?: (value?: string) => void;
  disabled: boolean;
}

export const TextInput = ({
  label,
  value,
  onChange,
  disabled,
}: TextInputProps) => {
  const isVerticalScreen = useMediaQuery('(max-width:800px)');

  return (
    <Box
      sx={{
        marginBottom: 1,
        px: 1,
        flex: 1,
      }}
    >
      <InputWithLabelRow
        Input={
          <BasicTextInput
            fullWidth
            sx={{
              '& .MuiInputBase-input': {
                backgroundColor: theme =>
                  disabled
                    ? theme.palette.background.toolbar
                    : theme.palette.background.white,
              },
            }}
            slotProps={{
              input: {
                sx: {
                  boxShadow: theme => (!disabled ? theme.shadows[2] : 'none'),
                  background: theme =>
                    disabled
                      ? theme.palette.background.toolbar
                      : theme.palette.background.white,
                },
              },
            }}
            value={value}
            onChange={e => onChange?.(e.target.value)}
            disabled={disabled}
          />
        }
        label={label}
        labelProps={{
          sx: {
            width: {
              xs: '100%',
            },
          },
        }}
        sx={{
          justifyContent: 'space-between',
          flexDirection: {
            xs: isVerticalScreen ? 'column' : 'row',
            md: 'row',
          },
          alignItems: { xs: 'flex-start', md: 'center' },
        }}
      />
    </Box>
  );
};
