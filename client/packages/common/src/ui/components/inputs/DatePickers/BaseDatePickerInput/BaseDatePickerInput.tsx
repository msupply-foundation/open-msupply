import React, { FC } from 'react';
import { DatePicker, DatePickerProps } from '@mui/x-date-pickers';
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
  DatePickerProps<Date> & {
    error?: string | undefined;
    width?: number;
  }
> = ({ error, onChange, width, ...props }) => {
  const theme = useAppTheme();
  const [validationError, setValidationError] = React.useState<string | null>(
    null
  );
  const t = useTranslation('common');

  return (
    <DatePicker
      slots={{
        textField: TextField,
      }}
      onChange={(date, context) => {
        const { validationError } = context;

        setValidationError(
          validationError
            ? t(`error.date_${validationError}` as LocaleKey, {
                defaultValue: validationError,
              })
            : null
        );
        if (!validationError) onChange?.(date, context);
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
          error: !!error || !!validationError,
          helperText: error ?? validationError ?? '',
          sx: { width, '& .MuiFormHelperText-root': { color: 'error.main' } },
        },
      }}
      {...props}
    />
  );
};
