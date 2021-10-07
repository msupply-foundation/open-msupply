import React from 'react';
import { Grid, Input, InputLabel } from '@mui/material';
import { UseFormRegisterReturn } from 'react-hook-form';
import { LocaleKey, useTranslation } from '../../intl/intlHelpers';

const inputStyle = {
  backgroundColor: '#f2f2f5',
  borderRadius: '8px',
  color: '#555770',
  padding: '4px 8px',
  width: '240px',
};

const labelStyle = {
  color: '#1c1c28',
  fontSize: '12px',
  paddingRight: '19px',
};

interface InputRowProps {
  defaultValue?: unknown;
  inputProps: UseFormRegisterReturn;
  labelKey: LocaleKey;
}

export const LabelledInputRow: React.FC<InputRowProps> = ({
  defaultValue,
  inputProps,
  labelKey,
}) => {
  const t = useTranslation();

  return (
    <Grid xs={12} container>
      <Grid container xs={2} alignItems="center" justifyContent="flex-end">
        <InputLabel sx={labelStyle}>{t(labelKey)}</InputLabel>
      </Grid>
      <Grid item xs={10} sx={{ marginBottom: '4px' }}>
        <Input
          defaultValue={defaultValue}
          disableUnderline
          sx={inputStyle}
          {...inputProps}
        />
      </Grid>
    </Grid>
  );
};
