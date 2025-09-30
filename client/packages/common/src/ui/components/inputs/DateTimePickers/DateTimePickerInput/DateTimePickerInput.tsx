import React, { useState } from 'react';
import {
  DateTimePicker,
  DateTimePickerProps,
  DateTimeValidationError,
  DateValidationError,
  PickersActionBarAction,
} from '@mui/x-date-pickers';
import { Box, SxProps, Typography, useMediaQuery } from '@mui/material';
import {
  DateUtils,
  LocaleKey,
  TypedTFunction,
  useTranslation,
} from '@common/intl';
import {
  FieldErrorWrapper,
  FieldErrorWrapperProps,
  useBufferState,
} from '@common/hooks';
import { getActionBarSx, getPaperSx, getTextFieldSx } from '../styles';

export const getFormattedDateError = (
  t: TypedTFunction<LocaleKey>,
  validationError: DateValidationError | DateTimeValidationError
) => {
  switch (validationError) {
    case 'invalidDate':
      return t('error.date_invalidDate');
    case 'minDate':
      return t('error.date_minDate');
    case 'maxDate':
      return t('error.date_maxDate');
    case 'disablePast':
      return t('error.date_disablePast');
    case 'disableFuture':
      return t('error.date_disableFuture');
    default:
      return validationError ?? '';
  }
};

type DateTimePickerInputProps = Omit<DateTimePickerProps<true>, 'onChange'> & {
  error?: boolean;
  errorText?: string;
  // `setError` used by FormErrorState handler, `onError` used by JSONForms --
  // should be integrated into single FormErrorState at some point
  setError?: (error: string | null) => void;
  onError?: (validationError: string, date?: Date | null) => void;
  required?: boolean;
  width?: number | string;
  label?: string;
  onChange: (value: Date | null) => void;
  // This allows a calling component to know whether the date was changed via
  // keyboard input or the picker UI
  setIsOpen?: (open: boolean) => void;
  showTime?: boolean;
  actions?: PickersActionBarAction[];
  dateAsEndOfDay?: boolean;
  disableFuture?: boolean;
  textFieldSx?: SxProps;
};

export const DateTimePickerInput = ({
  onChange,
  onError,
  setIsOpen,
  width,
  label,
  minDate,
  maxDate,
  showTime,
  actions,
  dateAsEndOfDay,
  disableFuture,
  error,
  setError,
  errorText,
  required,
  textFieldSx: inputSx,
  slotProps,
  ...props
}: DateTimePickerInputProps) => {
  const [internalError, setInternalError] = useState<string | null>(null);
  const [value, setValue] = useBufferState<Date | null>(props.value ?? null);
  const [isInitialEntry, setIsInitialEntry] = useState(true);
  const t = useTranslation();
  const format =
    props.format === undefined ? (showTime ? 'P p' : 'P') : props.format;

  const isDesktop = useMediaQuery('(pointer: fine)');

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

    const dateToSave = date && dateAsEndOfDay ? DateUtils.endOfDay(date) : date;
    updateDate(dateToSave);
  };

  return (
    <Box sx={{ display: 'flex', width: '100%', maxWidth: width }}>
      <DateTimePicker
        format={format}
        onChange={(date, context) => {
          const { validationError } = context;

          if (validationError) {
            const translatedError = getFormattedDateError(t, validationError);
            if (onError) onError(translatedError, date);
            if (setError) setError(translatedError);
            else setInternalError(validationError ? translatedError : null);

            // If there is a validation error, set internal value (so user can
            // keep typing) but not the external one via handleDateInput
            setValue(date);
            return;
          }
          if (!validationError) {
            setIsInitialEntry(false);
            setInternalError(null);
          }

          handleDateInput(date);
        }}
        label={label}
        slotProps={{
          mobilePaper: { sx: getPaperSx() },
          desktopPaper: { sx: getPaperSx() },
          actionBar: {
            actions: actions ?? ['clear', 'accept'],
            sx: getActionBarSx(),
          },
          textField: {
            onBlur: () => {
              setIsInitialEntry(false);
              // Apply max/mins on blur if present
              if (minDate || maxDate) {
                setInternalError(null);
                if (setError) setError(null);
                handleDateInput(value);
              }
            },
            error: !!error || (!isInitialEntry && !!internalError),
            helperText:
              errorText || (!isInitialEntry ? (internalError ?? '') : ''),
            sx: {
              ...getTextFieldSx(!!label, !showTime, inputSx, width),
              width,
              minWidth: showTime ? 200 : undefined,
            },
          },

          tabs: {
            hidden: showTime && !isDesktop ? false : true,
          },
          ...slotProps,
        }}
        views={
          showTime
            ? ['year', 'month', 'day', 'hours', 'minutes']
            : ['year', 'month', 'day']
        }
        minDate={minDate}
        maxDate={maxDate}
        disableFuture={disableFuture}
        onOpen={() => setIsOpen?.(true)}
        onClose={() => setIsOpen?.(false)}
        {...props}
        value={value}
      />
      {required && (
        <Typography
          sx={{
            width: '0px', // Prevents asterisk from taking up space - hack but consistent with other inputs
            color: 'primary.light',
            fontSize: '17px',
            marginRight: 0.5,
            pl: 0.2,
          }}
        >
          *
        </Typography>
      )}
    </Box>
  );
};

export const DateTimePickerInputWithError = ({
  code,
  label,
  value,
  required,
  customErrorState,
  customErrorMessage,
  ...dateTimeInputProps
}: DateTimePickerInputProps &
  Omit<FieldErrorWrapperProps<Date | null>, 'children'>) => (
  <FieldErrorWrapper
    {...{ code, label, value, required, customErrorState, customErrorMessage }}
  >
    {errorProps => (
      <DateTimePickerInput
        {...dateTimeInputProps}
        {...errorProps}
        label={undefined} // Suppress input's own label
      />
    )}
  </FieldErrorWrapper>
);
