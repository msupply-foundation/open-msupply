import React, { FC } from 'react';
import Fade from '@mui/material/Fade';
import Popper, { PopperProps } from '@mui/material/Popper';

export interface BasePopoverProps extends Omit<PopperProps, 'open'> {
  // I like having is as a prefix for boolean props
  isOpen: boolean;
  anchorEl: PopperProps['anchorEl'];
  width?: number;
  height?: number;
}

export const BasePopover: FC<BasePopoverProps> = ({
  children,
  isOpen,
  anchorEl,
  ...popperProps
}) => {
  return (
    <Popper
      open={isOpen}
      anchorEl={anchorEl}
      transition
      placement="bottom-start"
      style={{ zIndex: 1301 }}
      {...popperProps}
    >
      {({ TransitionProps }) => (
        <Fade {...TransitionProps} timeout={350}>
          <div>{children}</div>
        </Fade>
      )}
    </Popper>
  );
};
