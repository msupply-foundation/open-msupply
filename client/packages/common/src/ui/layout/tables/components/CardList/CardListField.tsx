import React from 'react';
import { Box, Typography } from '@mui/material';

interface CardListFieldProps {
  label: React.ReactNode;
  children: React.ReactNode;
}

export const CardListField = ({ label, children }: CardListFieldProps) => (
  <Box display="flex" alignItems="center" gap={1} minWidth={0}>
    <Typography
      color="text.secondary"
      fontSize="0.8em"
      flexShrink={0}
      whiteSpace="nowrap"
    >
      {label}
    </Typography>
    <Box flex={1} minWidth={0}>
      {children}
    </Box>
  </Box>
);
