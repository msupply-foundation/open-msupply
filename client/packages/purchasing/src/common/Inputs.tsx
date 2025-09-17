import React, { useMemo } from 'react';
import {
  BasicTextInput,
  Box,
  BufferedTextArea,
  DateTimePickerInput,
  DateUtils,
  Formatter,
  InputWithLabelRow,
  LocaleKey,
  NumericTextInput,
  NumericTextInputProps,
  NumUtils,
  Theme,
  TypedTFunction,
  Typography,
  useTheme,
} from '@openmsupply-client/common';

const commonInputContainerSx = {
  marginBottom: 1,
  flex: 1,
};

const inputSlotProps = (disabled: boolean) => ({
  input: {
    sx: {
      boxShadow: (theme: Theme) => (!disabled ? theme.shadows[2] : 'none'),
      background: (theme: Theme) =>
        disabled
          ? theme.palette.background.toolbar
          : theme.palette.background.white,
    },
  },
});

export const createLabelRowSx = (isVerticalScreen: boolean) => ({
  justifyContent: 'space-between',
  flexDirection: {
    xs: isVerticalScreen ? 'column' : 'row',
    md: 'row',
  },
  alignItems: { xs: 'flex-start', md: 'center' },
});

export const commonLabelProps = {
  sx: {
    width: {
      xs: '100%',
    },
  },
};

export const useInputComponents = (
  t: TypedTFunction<LocaleKey>,
  disabled: boolean,
  isVerticalScreen: boolean
) => {
  return useMemo(
    () => ({
      numericInput: (
        label: LocaleKey,
        value: number | null | undefined,
        options: NumericTextInputProps = {}
      ) => {
        const { onChange, max, decimalLimit, endAdornment } = options;
        return (
          <NumInputRow
            key={label}
            disabled={disabled}
            value={value ?? 0}
            onChange={onChange}
            max={max}
            decimalLimit={decimalLimit}
            endAdornment={endAdornment}
            isVerticalScreen={isVerticalScreen}
            {...options}
            label={t(label)}
          />
        );
      },

      textInput: (
        label: LocaleKey,
        value: string | null | undefined,
        onChange?: (value?: string) => void,
        options: { disabled?: boolean } = {}
      ) => (
        <TextInput
          key={label}
          disabled={disabled}
          label={t(label)}
          value={value ?? ''}
          onChange={onChange}
          isVerticalScreen={isVerticalScreen}
          {...options}
        />
      ),

      multilineTextInput: (
        label: LocaleKey,
        value?: string | null,
        onChange?: (value?: string) => void,
        options: { disabled?: boolean } = {}
      ) => (
        <MultilineTextInput
          key={label}
          disabled={disabled}
          label={t(label)}
          value={value ?? ''}
          onChange={onChange}
          {...options}
        />
      ),

      dateInput: (
        label: LocaleKey,
        value?: string | null,
        onChange?: (value: string | null) => void,
        options: { disabled?: boolean } = {}
      ) => (
        <DateInput
          key={label}
          disabled={disabled}
          label={t(label)}
          value={value}
          isVerticalScreen={isVerticalScreen}
          onChange={onChange}
          {...options}
        />
      ),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, isVerticalScreen]
  );
};

const NumInputRow = ({
  label,
  value,
  isVerticalScreen,
  onChange,
  disabled = false,
  max,
  decimalLimit,
  endAdornment,
  ...rest
}: NumericTextInputProps & {
  isVerticalScreen: boolean;
  label: string;
}) => {
  const roundedValue = NumUtils.round(value ?? 0, 2);

  const handleChange = (newValue?: number) => {
    if (!onChange || newValue === roundedValue) return;

    const value = newValue === undefined ? 0 : newValue;
    onChange(value);
  };

  return (
    <Box sx={commonInputContainerSx}>
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
            slotProps={inputSlotProps(disabled)}
            min={0}
            value={roundedValue}
            onChange={handleChange}
            disabled={disabled}
            max={max}
            decimalLimit={decimalLimit ?? 0}
            endAdornment={endAdornment}
            {...rest}
          />
        }
        label={label}
        labelProps={commonLabelProps}
        sx={createLabelRowSx(isVerticalScreen)}
      />
    </Box>
  );
};

interface TextInputProps {
  label: string;
  value: string;
  isVerticalScreen: boolean;
  onChange?: (value?: string) => void;
  disabled: boolean;
}

const TextInput = ({
  label,
  value,
  isVerticalScreen,
  onChange,
  disabled,
}: TextInputProps) => {
  return (
    <Box sx={commonInputContainerSx}>
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
            slotProps={inputSlotProps(disabled)}
            value={value}
            onChange={e => onChange?.(e.target.value)}
            disabled={disabled}
          />
        }
        label={label}
        labelProps={commonLabelProps}
        sx={createLabelRowSx(isVerticalScreen)}
      />
    </Box>
  );
};

interface MultilineTextInputProps {
  label: string;
  value: string;
  onChange?: (value?: string) => void;
  disabled: boolean;
}

const MultilineTextInput = ({
  label,
  value,
  onChange,
  disabled,
}: MultilineTextInputProps) => {
  return (
    <Box flex={1}>
      <Typography variant="body1" fontWeight="bold" pt={0.5}>
        {label}:
      </Typography>
      <BufferedTextArea
        value={value}
        onChange={e => onChange?.(e.target.value)}
        slotProps={inputSlotProps(disabled)}
        disabled={disabled}
        minRows={3}
        maxRows={3}
      />
    </Box>
  );
};

interface DateInputProps {
  label: string;
  value?: string | null;
  isVerticalScreen: boolean;
  onChange?: (value: string | null) => void;
  disabled: boolean;
}

const DateInput = ({
  label,
  value,
  isVerticalScreen,
  onChange,
  disabled,
}: DateInputProps) => {
  const theme = useTheme();
  const date = DateUtils.getDateOrNull(value);
  const handleChange = (newValue: Date | null) => {
    if (newValue) {
      onChange?.(Formatter.naiveDate(DateUtils.getNaiveDate(newValue)));
    } else {
      onChange?.(null);
    }
  };

  return (
    <Box sx={{ ...commonInputContainerSx, px: 0 }}>
      <InputWithLabelRow
        Input={
          <DateTimePickerInput
            showTime={false}
            sx={{
              '& .MuiInputBase-input': {
                backgroundColor: theme =>
                  disabled
                    ? theme.palette.background.toolbar
                    : theme.palette.background.white,
              },
            }}
            textFieldSx={{
              boxShadow: !disabled ? theme.shadows[2] : 'none',
              background: disabled
                ? theme.palette.background.toolbar
                : theme.palette.background.white,
            }}
            value={date}
            onChange={handleChange}
            disabled={disabled}
          />
        }
        label={label}
        labelProps={commonLabelProps}
        sx={createLabelRowSx(isVerticalScreen)}
      />
    </Box>
  );
};
