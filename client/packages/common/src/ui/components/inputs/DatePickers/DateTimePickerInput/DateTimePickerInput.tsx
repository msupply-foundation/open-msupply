import React, { FC, useState } from 'react';
import { DateTimePicker, DateTimePickerProps } from '@mui/x-date-pickers';
import { BasicTextInput } from '../../TextInput/BasicTextInput';
import { useAppTheme } from '@common/styles';
import { StandardTextFieldProps, TextFieldProps } from '@mui/material';
import { DateUtils, useTranslation } from '@common/intl';
import { getFormattedDateError } from '../BaseDatePickerInput';

const TextField = (params: TextFieldProps) => {
  const textInputProps: StandardTextFieldProps = {
    ...params,
    variant: 'standard',
    sx: { width: '150px', ...params.sx },
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
  }
> = ({
  error,
  onChange,
  onError,
  width,
  label,
  textFieldProps,
  format = 'dd/MM/yyyy HH:mm',
  ...props
}) => {
  const theme = useAppTheme();
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isInitialEntry, setIsInitialEntry] = useState(true);
  const t = useTranslation('common');

  return (
    <DateTimePicker
      format={format}
      slots={{
        textField: TextField,
      }}
      // onAccept={date => onChange(date)}
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
          onChange(date);
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
          onBlur: () => setIsInitialEntry(false),
          label,
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
      {...props}
      value={DateUtils.getDateOrNull(props.value)}
    />
  );
};
