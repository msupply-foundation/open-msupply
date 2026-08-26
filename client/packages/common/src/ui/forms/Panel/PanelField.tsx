import React from 'react';
import { Grid } from '@mui/material';
import { PropsWithChildrenOnly } from '@common/types';

export const PanelField: React.FC<PropsWithChildrenOnly> = props => (
  <Grid
    item
    flex={1}
    {...props}
    sx={{
      color: theme => theme.palette.gray.main,
      textAlign: 'right',
      fontSize: '12px',
    }}
  />
);
