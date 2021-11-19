import React from 'react';
import { Grid, InputLabel } from '@mui/material';
import { LocaleKey, useTranslation } from '../../../intl';
import { Property } from 'csstype';

export interface ModalLabelProps {
  labelKey: LocaleKey;
  justifyContent?: Property.JustifyContent;
}

const labelStyle = {
  fontSize: '12px',
  paddingRight: '19px',
};

export const ModalLabel: React.FC<ModalLabelProps> = ({
  labelKey,
  justifyContent = 'flex-start',
}) => {
  const t = useTranslation();
  return (
    <Grid
      item
      xs={2}
      alignItems="center"
      justifyContent={justifyContent}
      sx={{
        alignItems: 'center',
        display: 'flex',
      }}
    >
      <InputLabel sx={labelStyle}>{t(labelKey)}</InputLabel>
    </Grid>
  );
};
