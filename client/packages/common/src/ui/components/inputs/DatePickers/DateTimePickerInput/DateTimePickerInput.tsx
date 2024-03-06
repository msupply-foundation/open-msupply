import React, { FC, useState } from 'react';
import { DateTimePicker, DateTimePickerProps } from '@mui/x-date-pickers';
import { BasicTextInput } from '../../TextInput/BasicTextInput';
import { useAppTheme } from '@common/styles';
import { StandardTextFieldProps, TextFieldProps } from '@mui/material';
import { DateUtils, useIntlUtils, useTranslation } from '@common/intl';
import { getFormattedDateError } from '../BaseDatePickerInput';

const TextField = (params: TextFieldProps) => {
  const textInputProps: StandardTextFieldProps = {
    ...params,
    variant: 'standard',
  };
  return <BasicTextInput {...textInputProps} />;
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
  ...props
}) => {
  const theme = useAppTheme();
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isInitialEntry, setIsInitialEntry] = useState(true);
  const t = useTranslation();
  const { getLocale } = useIntlUtils();
  const dateParseOptions = { locale: getLocale() };
  const format = props.format ?? showTime ? 'P p' : 'P';

  // Max/Min should be restricted by the UI, but it's not restricting TIME input
  // (only Date component). So this function will enforce the max/min after
  // input
  const handleDateInput = (date: Date | null) => {
    if (minDate && date && date < minDate) {
      onChange(minDate);
      return;
    }
    if (maxDate && date && date > maxDate) {
      onChange(maxDate);
      return;
    }
    onChange(date);
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
          helperText: !isInitialEntry ? error ?? internalError ?? '' : '',
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
      }}
      views={
        showTime
          ? ['year', 'month', 'day', 'hours', 'minutes', 'seconds']
          : ['year', 'month', 'day']
      }
      minDate={minDate}
      maxDate={maxDate}
      {...props}
      value={props.value}
    />
  );
};
