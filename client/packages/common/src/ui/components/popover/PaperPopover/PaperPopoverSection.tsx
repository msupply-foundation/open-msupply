import React, { FC, PropsWithChildren } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export interface PaperPopoverSectionProps {
  Icon?: React.ReactNode;
  label?: string;
  labelStyle?: React.CSSProperties;
  alignItems?: 'center' | 'flex-start' | 'flex-end' | 'stretch';
  onClick?: () => void;
}

export const PaperPopoverSection: FC<
  PropsWithChildren<PaperPopoverSectionProps>
> = ({ children, Icon, label, labelStyle, alignItems, onClick }) => (
  <Box
    gap={2}
    p={3}
    flexDirection="column"
    display="flex"
    alignItems={alignItems}
    sx={{ wordBreak: 'break-word' }}
    onClick={onClick}
  >
    <Box display="flex" alignItems="flex-start" gap={1} sx={{ width: '100%' }}>
      <Box flex={0}>{Icon}</Box>

      <Typography fontWeight="700" style={labelStyle} flex={1}>
        {label}
      </Typography>
    </Box>
    {children}
  </Box>
);
