import React from 'react';
import { Box, Typography, useMediaQuery } from '@mui/material';

interface CardListFieldProps {
  label: React.ReactNode;
  children: React.ReactNode;
}

export const CardListField = ({ label, children }: CardListFieldProps) => {
  const isLandscape = useMediaQuery('(orientation: landscape)');

  return (
    <Box
      display="flex"
      flexDirection={isLandscape ? 'column' : 'row'}
      alignItems={isLandscape ? 'stretch' : 'center'}
      gap={isLandscape ? 0 : 1}
      minWidth={0}
    >
      <Typography
        color="text.secondary"
        fontSize={isLandscape ? '0.7em' : '0.8em'}
        lineHeight={isLandscape ? 1.4 : undefined}
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
};
