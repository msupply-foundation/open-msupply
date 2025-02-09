import React, { FC, useState } from 'react';
import {
  DateTimePicker,
  DateTimePickerProps,
  PickersActionBarAction,
} from '@mui/x-date-pickers';
import { useAppTheme } from '@common/styles';
import { StandardTextFieldProps, TextFieldProps } from '@mui/material';
import { DateUtils, useIntlUtils, useTranslation } from '@common/intl';
import { getFormattedDateError } from '../BaseDatePickerInput';
import { useBufferState } from '@common/hooks';
import { DeprecatedBasicTextInput } from '../../TextInput';

const TextField = (params: TextFieldProps) => {
  const textInputProps: StandardTextFieldProps = {
    ...params,
    variant: 'standard',
  };
  return <DeprecatedBasicTextInput {...textInputProps} />;
};

export const DateTimePickerInput: FC<
  Omit<DateTimePickerProps<Date>, 'onChange'> & {
    error?: string | undefined;
    width?: number | string;
    label?: string;
    onChange: (value: Date | null) => void;
    onError?: (validationError: string, date?: Date | null) => void;
    textFieldProps?: TextFieldProps;
    showTime?: boolean;
    actions?: PickersActionBarAction[];
  }
> = ({
  error,
  onChange,
  onError,
  width,
  label,
  textFieldProps,
  minDate,
  maxDate,
  showTime,
  actions,
  ...props
}) => {
  const theme = useAppTheme();
  const [internalError, setInternalError] = useState<string | null>(null);
  const [value, setValue] = useBufferState<Date | null>(props.value ?? null);
  const [isInitialEntry, setIsInitialEntry] = useState(true);
  const t = useTranslation();
  const { getLocale } = useIntlUtils();
  const dateParseOptions = { locale: getLocale() };
  const format =
    props.format === undefined ? (showTime ? 'P p' : 'P') : props.format;

  const updateDate = (date: Date | null) => {
    setValue(date);
    onChange(date);
  };

  // Max/Min should be restricted by the UI, but it's not restricting TIME input
  // (only Date component). So this function will enforce the max/min after
  // input
  const handleDateInput = (date: Date | null) => {
    if (minDate && date && date < minDate) {
      updateDate(minDate);
      return;
    }
    if (maxDate && date && date > maxDate) {
      updateDate(maxDate);
      return;
    }
    updateDate(date);
  };

  return (
    <DateTimePicker
      format={format}
      slots={{
        textField: TextField,
      }}
      onAccept={handleDateInput}
      onChange={(date, context) => {
        const { validationError } = context;

        if (validationError) {
          const translatedError = getFormattedDateError(t, validationError);
          if (onError) onError(translatedError, date);
          else setInternalError(validationError ? translatedError : null);
        }
        if (!validationError) {
          setIsInitialEntry(false);
          setInternalError(null);
        }
      }}
      slotProps={{
        popper: {
          sx: {
            '& .MuiTypography-root.Mui-selected': {
              backgroundColor: `${theme.palette.secondary.main}`,
            },
            '& .MuiTypography-root.Mui-selected:hover': {
              backgroundColor: `${theme.palette.secondary.main}`,
            },
            '& .Mui-selected:focus': {
              backgroundColor: `${theme.palette.secondary.main}`,
            },
            '& .MuiPickersDay-root.Mui-selected': {
              backgroundColor: `${theme.palette.secondary.main}`,
            },
          },
        },
        desktopPaper: {
          sx: {
            '& .Mui-selected': {
              backgroundColor: `${theme.palette.secondary.main}!important`,
            },
            '& .Mui-selected:focus': {
              backgroundColor: `${theme.palette.secondary.main}`,
            },
            '& .Mui-selected:hover': {
              backgroundColor: `${theme.palette.secondary.main}`,
            },
          },
        },
        textField: {
          error: !isInitialEntry && (!!error || !!internalError),
          helperText: !isInitialEntry ? (error ?? internalError ?? '') : '',
          onBlur: e => {
            handleDateInput(
              DateUtils.getDateOrNull(e.target.value, format, dateParseOptions)
            );
            setIsInitialEntry(false);
          },
          label,
          ...textFieldProps,
          sx: {
            '& .MuiFormHelperText-root': {
              color: 'error.main',
            },
            ...textFieldProps?.sx,
            width,
          },
        },
        ...(actions ? { actionBar: { actions } } : {}),
      }}
      views={
        showTime
          ? ['year', 'month', 'day', 'hours', 'minutes']
          : ['year', 'month', 'day']
      }
      minDate={minDate}
      maxDate={maxDate}
      {...props}
      value={value}
    />
  );
};
