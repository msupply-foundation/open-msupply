import React, { FC, PropsWithChildren } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export interface PaperPopoverSectionProps {
  label?: string;
  labelStyle?: React.CSSProperties;
  alignItems?: 'center' | 'flex-start' | 'flex-end' | 'stretch';
}

export const PaperPopoverSection: FC<
  PropsWithChildren<PaperPopoverSectionProps>
> = ({ children, label, labelStyle, alignItems }) => (
  <Box
    gap={2}
    p={3}
    flexDirection="column"
    display="flex"
    alignItems={alignItems}
    sx={{ wordBreak: 'break-word' }}
  >
    <Typography fontWeight="700" style={labelStyle}>
      {label}
    </Typography>
    {children}
  </Box>
);
