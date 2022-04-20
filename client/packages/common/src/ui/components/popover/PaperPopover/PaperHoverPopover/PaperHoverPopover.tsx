import React, { FC, PropsWithChildren } from 'react';
import { HoverPopover } from '../../HoverPopover';
import Paper from '@mui/material/Paper';
import { PaperPopoverProps } from '..';

export const PaperHoverPopover: FC<PropsWithChildren<PaperPopoverProps>> = ({
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
