import React from 'react';
import { Grid, InputLabel } from '@mui/material';
import { LocaleKey, useTranslation } from '../../../intl/intlHelpers';

export interface ModalLabelProps {
  labelKey: LocaleKey;
}

const labelStyle = {
  fontSize: '12px',
  paddingRight: '19px',
};

export const ModalLabel: React.FC<ModalLabelProps> = ({ labelKey }) => {
  const t = useTranslation();
  return (
    <Grid item xs={2} alignItems="center" justifyContent="flex-end">
      <InputLabel sx={labelStyle}>{t(labelKey)}</InputLabel>
    </Grid>
  );
};
