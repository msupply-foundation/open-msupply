import React, { FC } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export interface PaperPopoverSectionProps {
  label?: string;
}

export const PaperPopoverSection: FC<PaperPopoverSectionProps> = ({
  children,
  label,
}) => (
  <Box gap={2} p={3} flexDirection="column" display="flex">
    <Typography fontWeight="700">{label}</Typography>
    {children}
  </Box>
);
