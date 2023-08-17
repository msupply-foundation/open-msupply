import React, { FC, useState } from 'react';
import {
  DatePicker,
  DatePickerProps,
  DateValidationError,
} from '@mui/x-date-pickers';
import { useAppTheme } from '@common/styles';
import { BasicTextInput } from '../../TextInput';
import { StandardTextFieldProps, TextFieldProps } from '@mui/material';
import { LocaleKey, useTranslation } from '@common/intl';

const TextField = (params: TextFieldProps) => {
  const textInputProps: StandardTextFieldProps = {
    ...params,
    variant: 'standard',
  };
  return <BasicTextInput {...textInputProps} />;
};

export const BaseDatePickerInput: FC<
  Omit<DatePickerProps<Date>, 'onError'> & {
    error?: string | undefined;
    width?: number;
    onError?: (validationError: string, date?: Date | null) => void;
  }
> = ({ error, onChange, onError, width, ...props }) => {
  const theme = useAppTheme();
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isInitialEntry, setIsInitialEntry] = useState(true);
  const t = useTranslation('common');

  const getTranslatedDateError = (validationError: DateValidationError) =>
    t(`error.date_${validationError}` as LocaleKey, {
      defaultValue: validationError,
    });

  return (
    <DatePicker
      slots={{
        textField: TextField,
      }}
      onChange={(date, context) => {
        const { validationError } = context;

        if (validationError) {
          const translatedError = getTranslatedDateError(validationError);
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
          helperText: !isInitialEntry ? error ?? internalError ?? '' : '',
          sx: { width, '& .MuiFormHelperText-root': { color: 'error.main' } },
          onBlur: () => setIsInitialEntry(false),
        },
      }}
      {...props}
    />
  );
};
