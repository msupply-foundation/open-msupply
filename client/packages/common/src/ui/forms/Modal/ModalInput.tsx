import { Grid, Input } from '@mui/material';
import React from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';

export interface ModalInputProps {
  defaultValue?: unknown;
  inputProps: UseFormRegisterReturn;
}

const inputStyle = {
  backgroundColor: '#f2f2f5',
  borderRadius: '8px',
  color: '#555770',
  padding: '4px 8px',
  width: '240px',
};

export const ModalInput: React.FC<ModalInputProps> = ({
  defaultValue,
  inputProps,
}) => {
  return (
    <Grid item xs={10} sx={{ marginBottom: '4px' }}>
      <Input
        defaultValue={defaultValue}
        disableUnderline
        sx={inputStyle}
        {...inputProps}
      />
    </Grid>
  );
};
