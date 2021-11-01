import React from 'react';
import { Grid } from '@mui/material';
import { get, UseFormRegisterReturn, useFormState } from 'react-hook-form';

import { BasicTextInput } from '../../components/inputs/TextInput/BasicTextInput';

export interface ModalInputProps {
  defaultValue?: unknown;
  inputProps: UseFormRegisterReturn;
  width?: number;
}

export const ModalInput: React.FC<ModalInputProps> = ({
  defaultValue,
  inputProps,
  width = 240,
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
      <BasicTextInput
        defaultValue={defaultValue}
        sx={{ width: `${width}px` }}
        {...errorProps}
        {...inputProps}
      />
    </Grid>
  );
};
