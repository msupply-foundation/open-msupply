import React, { FC } from 'react';
import { HoverPopover } from '../HoverPopover';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper, { PaperProps } from '@mui/material/Paper';

interface PaperPopoverProps {
  Content: React.ReactElement<any, any>;
  paperProps?: PaperProps;
  width?: number;
  height?: number;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export const PaperPopover: FC<PaperPopoverProps> = ({
  children,
  Content,
  paperProps,
  width,
  height,
  placement = 'left',
}) => {
  return (
    <HoverPopover
      placement={placement}
      Content={
        <Paper
          sx={{
            height: height ? `${height}px` : 'auto',
            width: width ? `${width}px` : 'auto',
            borderRadius: '16px',
            boxShadow: theme => theme.shadows[7],
            ...paperProps?.sx,
          }}
          {...paperProps}
        >
          {Content}
        </Paper>
      }
    >
      {children}
    </HoverPopover>
  );
};

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
