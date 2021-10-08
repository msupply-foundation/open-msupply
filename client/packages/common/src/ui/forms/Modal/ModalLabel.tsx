import React from 'react';
import { Grid, InputLabel } from '@mui/material';
import { LocaleKey, useTranslation } from '../../../intl/intlHelpers';

export interface ModalLabelProps {
  labelKey: LocaleKey;
}

const labelStyle = {
  color: '#1c1c28',
  fontSize: '12px',
  paddingRight: '19px',
};

export const ModalLabel: React.FC<ModalLabelProps> = ({ labelKey }) => {
  const t = useTranslation();
  return (
    <Grid container xs={2} alignItems="center" justifyContent="flex-end">
      <InputLabel sx={labelStyle}>{t(labelKey)}</InputLabel>
    </Grid>
  );
};
