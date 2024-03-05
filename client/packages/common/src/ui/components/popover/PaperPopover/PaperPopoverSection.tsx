import React, { FC, PropsWithChildren } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { SxProps, Theme } from '@mui/material';

export interface PaperPopoverSectionProps {
  label?: string;
  labelStyle?: React.CSSProperties;
  alignItems?: 'center' | 'flex-start' | 'flex-end' | 'stretch';
  sx?: SxProps<Theme>;
}

export const PaperPopoverSection: FC<
  PropsWithChildren<PaperPopoverSectionProps>
> = ({ children, label, labelStyle, alignItems, sx }) => (
  <Box
    gap={2}
    p={3}
    flexDirection="column"
    display="flex"
    alignItems={alignItems}
    sx={sx}
  >
    <Typography fontWeight="700" style={labelStyle}>
      {label}
    </Typography>
    {children}
  </Box>
);
