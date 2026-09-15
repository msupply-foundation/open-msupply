import React from 'react';
import { Box, BoxProps } from '@mui/material';

interface DividerProps extends BoxProps {
  color?: string;
  margin?: number;
}

export const Divider: React.FC<DividerProps> = ({
  margin = 0,
  sx,
  color = 'divider',
}) => (
  <>
    <Box sx={{ height: `${margin}px` }} />
    <Box
      sx={{
        backgroundColor: color,
        height: '1px',
        width: '100%',
        ...sx,
      }}
    />
    <Box sx={{ height: `${margin}px` }} />
  </>
);
