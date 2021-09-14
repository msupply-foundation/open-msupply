import React from 'react';
import { styled } from '@material-ui/core';
import { Grid } from '..';

const StyledGrid = styled(Grid)(({ theme }) => ({
  color: theme.palette.form.field,
  fontSize: 12,
}));

export const Field: React.FC = props => <StyledGrid item flex={1} {...props} />;
