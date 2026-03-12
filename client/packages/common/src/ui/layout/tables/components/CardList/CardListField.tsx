import React from 'react';
import { Box, Typography } from '@mui/material';

interface CardListFieldProps {
  label: React.ReactNode;
  children: React.ReactNode;
  span?: number;
}

export const CardListField = ({ label, children, span }: CardListFieldProps) => (
  <Box
    display="flex"
    flexDirection="column"
    minWidth={0}
    sx={span ? { gridColumn: `span ${span}` } : undefined}
  >
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
