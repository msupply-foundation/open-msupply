import React from 'react';
import { styled } from '@material-ui/core';
import { Grid } from '..';

const StyledGrid = styled(Grid)(({ theme }) => ({
  color: theme.palette.form.label,
  fontSize: 12,
}));

export const Label: React.FC = props => <StyledGrid item flex={1} {...props} />;
