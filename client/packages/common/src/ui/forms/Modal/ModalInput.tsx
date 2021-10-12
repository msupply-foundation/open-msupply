import { Grid } from '@mui/material';
import React from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import { BasicTextInput } from '@openmsupply-client/common';

export interface ModalInputProps {
  defaultValue?: unknown;
  inputProps: UseFormRegisterReturn;
}

export const ModalInput: React.FC<ModalInputProps> = ({
  defaultValue,
  inputProps,
}) => {
  return (
    <Grid item xs={10}>
      <BasicTextInput
        defaultValue={defaultValue}
        sx={{ width: '240px' }}
        {...inputProps}
      />
    </Grid>
  );
};
