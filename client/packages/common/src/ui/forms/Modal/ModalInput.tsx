import React from 'react';
import { Grid, Typography } from '@mui/material';
import { get, UseFormRegisterReturn, useFormState } from 'react-hook-form';

import { BasicTextInput } from '../../components/inputs/TextInput/BasicTextInput';

export interface ModalInputProps {
  appendedText?: string;
  defaultValue?: unknown;
  inputProps: UseFormRegisterReturn;
}

export const ModalInput: React.FC<ModalInputProps> = ({
  appendedText,
  defaultValue,
  inputProps,
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
      }}
    >
      <BasicTextInput
        defaultValue={defaultValue}
        sx={{ width: '240px' }}
        {...errorProps}
        {...inputProps}
      />
      {appendedText && (
        <Typography
          style={{
            fontSize: 12,
            marginLeft: 16,
            alignSelf: 'center',
            display: 'inline-flex',
          }}
          component="div"
        >
          {appendedText}
        </Typography>
      )}
    </Grid>
  );
};
