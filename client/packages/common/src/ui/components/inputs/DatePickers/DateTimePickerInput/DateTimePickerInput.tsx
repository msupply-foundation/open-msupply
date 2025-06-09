import React, { useState } from 'react';
import {
  DateTimePicker,
  DateTimePickerProps,
  PickersActionBarAction,
} from '@mui/x-date-pickers';
import { useAppTheme } from '@common/styles';
import { Theme, useMediaQuery } from '@mui/material';
import { DateUtils, useTranslation } from '@common/intl';
import { getFormattedDateError } from '../BaseDatePickerInput';
import { useBufferState } from '@common/hooks';

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
  displayAs,
  error,
  ...props
}: Omit<DateTimePickerProps<true>, 'onChange'> & {
  error?: string | undefined;
  width?: number | string;
  label?: string;
  onChange: (value: Date | null) => void;
  onError?: (validationError: string, date?: Date | null) => void;
  // This allows a calling component to know whether the date was changed via
  // keyboard input or the picker UI
  setIsOpen?: (open: boolean) => void;
  showTime?: boolean;
  actions?: PickersActionBarAction[];
  dateAsEndOfDay?: boolean;
  disableFuture?: boolean;
  displayAs?: 'date' | 'dateTime';
}) => {
  const theme = useAppTheme();
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
    <DateTimePicker
      format={format}
      onAccept={handleDateInput}
      label={label}
      onChange={(date, context) => {
        handleDateInput(date);
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
        popper: { sx: getPopperSx(theme) },
        desktopPaper: { sx: getDesktopPaperSx(theme) },
        textField: {
          error: !isInitialEntry && (!!error || !!internalError),
          helperText: !isInitialEntry ? (error ?? internalError ?? '') : '',
          sx: {
            ...getTextFieldSx(theme, !!label),
            width,
            minWidth: displayAs === 'dateTime' ? 200 : undefined,
          },
        },

        tabs: {
          hidden: displayAs === 'dateTime' && !isDesktop ? false : true,
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
      disableFuture={disableFuture}
      onOpen={() => setIsOpen?.(true)}
      onClose={() => setIsOpen?.(false)}
      {...props}
      value={value}
    />
  );
};

const getTextFieldSx = (theme: Theme, hasLabel: boolean) => ({
  border: 'none',
  color: 'gray',
  '& .MuiPickersOutlinedInput-root': {
    backgroundColor: theme.palette.background.drawer,
    height: '36px',
    marginTop: hasLabel ? '16px' : 0,
    padding: '0 8px',
    borderRadius: '8px',
    '&.Mui-focused:not(.Mui-error)': {
      '& .MuiPickersOutlinedInput-notchedOutline': {
        border: 'none',
        borderBottom: 'solid 2px',
        borderColor: `${theme.palette.secondary.light}`,
        borderRadius: 0,
      },
    },
  },
  '& .MuiInputAdornment-root': {
    marginLeft: 0,
  },
  '& .MuiPickersOutlinedInput-notchedOutline': {
    border: 'none',
  },
  '& .MuiPickersSectionList-root': {
    color: 'gray.dark',
  },
  '& .MuiInputLabel-root': {
    top: '6px',
    color: 'gray.main',
    '&.Mui-focused': {
      color: 'gray.main',
    },
  },
});

const getPopperSx = (theme: Theme) => ({
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
});

const getDesktopPaperSx = (theme: Theme) => ({
  '& .Mui-selected': {
    backgroundColor: `${theme.palette.secondary.main}!important`,
  },
  '& .Mui-selected:focus': {
    backgroundColor: `${theme.palette.secondary.main}`,
  },
  '& .Mui-selected:hover': {
    backgroundColor: `${theme.palette.secondary.main}`,
  },
});
