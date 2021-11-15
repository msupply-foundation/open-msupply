import React from 'react';
import { Grid } from '@mui/material';
import { get, UseFormRegisterReturn, useFormState } from 'react-hook-form';

import { NumericTextInput } from '../../components/inputs/TextInput/NumericTextInput';

export interface ModalNumericInputProps {
  defaultValue?: unknown;
  disabled?: boolean;
  height?: number;
  inputProps: UseFormRegisterReturn;
  width?: number;
  value?: number;
}

export const ModalNumericInput: React.FC<ModalNumericInputProps> = ({
  defaultValue,
  disabled,
  height = 32,
  inputProps,
  width = 85,
  value,
}) => {
  const { errors } = useFormState();
  const error = get(errors, inputProps.name);
  const errorProps = error ? { error: true, helperText: error.message } : {};

  return (
    <Grid
      item
      xs={10}
      alignItems="center"
      justifyContent="flex-start"
      sx={{
        alignItems: 'center',
        display: 'flex',
        flexBasis: '0',
      }}
    >
      <NumericTextInput
        defaultValue={defaultValue}
        disabled={disabled}
        value={value}
        sx={{ width: `${width}px`, height: `${height}px` }}
        {...errorProps}
        {...inputProps}
      />
    </Grid>
  );
};
