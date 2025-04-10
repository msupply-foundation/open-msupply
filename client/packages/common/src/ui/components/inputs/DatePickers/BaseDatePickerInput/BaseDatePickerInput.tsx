import React, { FC, useState } from 'react';
import {
  DatePickerProps,
  DateTimeValidationError,
  DateValidationError,
  DesktopDatePicker,
} from '@mui/x-date-pickers';
import { useAppTheme } from '@common/styles';
import { DeprecatedBasicTextInput } from '../../TextInput';
import { StandardTextFieldProps, TextFieldProps } from '@mui/material';
import {
  DateUtils,
  LocaleKey,
  TypedTFunction,
  useTranslation,
} from '@common/intl';

const TextField = (params: TextFieldProps) => {
  const textInputProps: StandardTextFieldProps = {
    ...params,
    variant: 'standard',
  };
  return <DeprecatedBasicTextInput {...textInputProps} />;
};

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

export const BaseDatePickerInput: FC<
  Omit<DatePickerProps<Date>, 'onError'> & {
    error?: string | undefined;
    width?: number | string;
    label?: string;
    onError?: (validationError: string, date?: Date | null) => void;
    textFieldProps?: TextFieldProps;
    // This allows a calling component to know whether the date was changed via
    // keyboard input or the picker UI
    setIsOpen?: (open: boolean) => void;
    required?: boolean;
  }
> = ({
  error,
  onChange,
  onError,
  width,
  label,
  textFieldProps,
  setIsOpen,
  required,
  ...props
}) => {
  const t = useTranslation();
  const theme = useAppTheme();
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isInitialEntry, setIsInitialEntry] = useState(true);

  return (
    <DesktopDatePicker
      slots={{
        textField: TextField,
      }}
      onOpen={() => setIsOpen && setIsOpen(true)}
      onClose={() => setIsOpen && setIsOpen(false)}
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
          onChange?.(date, context);
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
          label,
          required,
          onBlur: () => setIsInitialEntry(false),
          ...textFieldProps,
          sx: {
            width,
            '& .MuiFormHelperText-root': {
              color: 'error.main',
            },
            ...textFieldProps?.sx,
          },
        },
      }}
      localeText={{
        okButtonLabel: t('button.ok'),
        cancelButtonLabel: t('button.cancel'),
        clearButtonLabel: t('button.clear'),
        todayButtonLabel: t('button.today'),
      }}
      {...props}
      value={DateUtils.getDateOrNull(props.value)}
    />
  );
};
