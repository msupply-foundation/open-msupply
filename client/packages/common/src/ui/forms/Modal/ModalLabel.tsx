import React from 'react';
import { Grid, InputLabel } from '@mui/material';
import { Property } from 'csstype';

export interface ModalLabelProps {
  label: string;
  justifyContent?: Property.JustifyContent;
}

const labelStyle = {
  fontSize: '12px',
  marginInlineEnd: '19px',
};

export const ModalLabel: React.FC<ModalLabelProps> = ({
  label,
  justifyContent = 'flex-start',
}) => (
  <Grid
    item
    xs={2}
    alignItems="center"
    justifyContent={justifyContent}
    sx={{
      alignItems: 'center',
      display: 'flex',
      minWidth: '80px',
      '&.MuiGrid-root': { flexBasis: 0 },
    }}
  >
    <InputLabel sx={labelStyle}>{label}</InputLabel>
  </Grid>
);
