import React from 'react';
import { Grid, styled } from '@material-ui/core';

const StyledGrid = styled(Grid)(({ theme }) => ({
  color: theme.palette.form.label,
  fontSize: 12,
}));

export const Label: React.FC = props => <StyledGrid item flex={1} {...props} />;
