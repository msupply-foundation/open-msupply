import React, { useState } from 'react';
import {
  DateTimePicker,
  DateTimePickerProps,
  DateTimeValidationError,
  DateValidationError,
  PickersActionBarAction,
} from '@mui/x-date-pickers';
import { useAppTheme } from '@common/styles';
import { Box, Theme, Typography, useMediaQuery } from '@mui/material';
import {
  DateUtils,
  LocaleKey,
  TypedTFunction,
  useTranslation,
} from '@common/intl';
import { useBufferState } from '@common/hooks';

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
  required,
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
  required?: boolean;
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
    <Box display="flex">
      <DateTimePicker
        format={format}
        onChange={(date, context) => {
          const { validationError } = context;

          if (validationError) {
            const translatedError = getFormattedDateError(t, validationError);
            if (onError) onError(translatedError, date);
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
          popper: { sx: getPopperSx(theme) },
          desktopPaper: { sx: getDesktopPaperSx(theme) },
          textField: {
            onBlur: () => {
              // Apply max/mins on blur if present
              if (minDate || maxDate) {
                setIsInitialEntry(false);
                setInternalError(null);
                handleDateInput(value);
              }
            },
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
    '&.Mui-error': {
      '& .MuiPickersOutlinedInput-notchedOutline': {
        borderWidth: '2px',
        borderStyle: 'solid',
      },
    },
  },
  '& .MuiPickersOutlinedInput-notchedOutline': {
    border: 'none',
  },
  '& .MuiInputAdornment-root': {
    marginLeft: 0,
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
