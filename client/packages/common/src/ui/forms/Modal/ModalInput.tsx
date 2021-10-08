import { Grid, Input, Theme } from '@mui/material';
import React from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';

export interface ModalInputProps {
  defaultValue?: unknown;
  inputProps: UseFormRegisterReturn;
}

const inputStyle = {
  backgroundColor: (theme: Theme) => theme.palette.background.menu,
  borderRadius: '8px',
  color: (theme: Theme) => theme.palette.darkGrey,
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
