import React from 'react';
import { Grid } from '@mui/material';
import { UseFormRegisterReturn, useFormState } from 'react-hook-form';

import { BasicTextInput } from '../../components/inputs/TextInput/BasicTextInput';
import { ModalErrorMessage } from './ModalErrorMessage';

export interface ModalInputProps {
  defaultValue?: unknown;
  inputProps: UseFormRegisterReturn;
}

export const ModalInput: React.FC<ModalInputProps> = ({
  defaultValue,
  inputProps,
}) => {
  const { errors } = useFormState();

  return (
    <Grid item xs={10}>
      <BasicTextInput
        defaultValue={defaultValue}
        sx={{ width: '240px' }}
        {...inputProps}
      />
      <ModalErrorMessage errors={errors} name={inputProps.name} />
    </Grid>
  );
};
