import React, { FC } from 'react';
import { HoverPopover } from '../HoverPopover';
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
  width = 250,
  height = 125,
  placement = 'left',
}) => {
  return (
    <HoverPopover
      placement={placement}
      Content={
        <Paper
          sx={{
            width,
            height,
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
