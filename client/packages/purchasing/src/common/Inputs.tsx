import React from 'react';
import {
  Box,
  InputWithLabelRow,
  LocaleKey,
  NumericTextInput,
  NumUtils,
  TypedTFunction,
  useMediaQuery,
} from '@openmsupply-client/common';

interface NumInputRowProps {
  label: string;
  value: number;
  onChange?: (value?: number) => void;
  disabled: boolean;
}

export const createNumericInput =
  (t: TypedTFunction<LocaleKey>, disabled: boolean) =>
  (
    label: LocaleKey,
    value: number | null | undefined,
    onChange?: (value?: number) => void
  ) => {
    return (
      <NumInputRow
        disabled={disabled}
        label={t(label)}
        value={value ?? 0}
        onChange={onChange}
      />
    );
  };

export const NumInputRow = ({
  label,
  value,
  onChange,
  disabled,
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
            decimalLimit={0}
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
