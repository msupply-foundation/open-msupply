import React, { FC } from 'react';
import Fade from '@mui/material/Fade';
import Paper, { PaperProps } from '@mui/material/Paper';
import Popper, { PopperProps } from '@mui/material/Popper';

export interface BasePopoverProps extends Omit<PopperProps, 'open'> {
  // I like having is as a prefix for boolean props
  isOpen: boolean;
  anchorEl: PopperProps['anchorEl'];
  paperProps?: PaperProps;
}

export const BasePopover: FC<BasePopoverProps> = ({
  children,
  isOpen,
  anchorEl,
  paperProps,
  ...popperProps
}) => {
  return (
    <Popper
      {...popperProps}
      open={isOpen}
      anchorEl={anchorEl}
      transition
      placement="bottom-start"
    >
      {({ TransitionProps }) => (
        <Fade {...TransitionProps} timeout={350}>
          <Paper
            {...paperProps}
            sx={{
              width: 240,
              height: 200,
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
