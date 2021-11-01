import React, { FC } from 'react';
import Fade from '@mui/material/Fade';
import Paper, { PaperProps } from '@mui/material/Paper';
import Popper, { PopperProps } from '@mui/material/Popper';

export interface BasePopoverProps extends Omit<PopperProps, 'open'> {
  // I like having is as a prefix for boolean props
  isOpen: boolean;
  anchorEl: PopperProps['anchorEl'];
  paperProps?: PaperProps;
  width?: number;
  height?: number;
}

export const BasePopover: FC<BasePopoverProps> = ({
  children,
  isOpen,
  anchorEl,
  paperProps,
  width = 240,
  height = 200,
  ...popperProps
}) => {
  return (
    <Popper
      open={isOpen}
      anchorEl={anchorEl}
      transition
      placement="bottom-start"
      {...popperProps}
    >
      {({ TransitionProps }) => (
        <Fade {...TransitionProps} timeout={350}>
          <Paper
            {...paperProps}
            sx={{
              width,
              height,
              boxShadow: theme => theme.shadows[7],
              ...paperProps?.sx,
            }}
          >
            {children}
          </Paper>
        </Fade>
      )}
    </Popper>
  );
};
