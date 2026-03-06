import React from 'react';
import { Box, Typography } from '@mui/material';

interface CardListFieldProps {
  label: React.ReactNode;
  children: React.ReactNode;
}

export const CardListField = ({ label, children }: CardListFieldProps) => (
  <Box display="flex" flexDirection="column" minWidth={0}>
    <Typography
      color="text.secondary"
      fontSize="0.7em"
      lineHeight={1.4}
      whiteSpace="nowrap"
    >
      {label}
    </Typography>
    <Box minWidth={0}>{children}</Box>
  </Box>
);
