import React, { useState } from 'react';
import MuiPopper, { PopperProps as MuiPopperProps } from '@mui/material/Popper';

import Fade from '@mui/material/Fade';
import Paper from '@mui/material/Paper';

export interface PopperProps extends Omit<MuiPopperProps, 'open'> {
  content: React.ReactNode;
  height?: number;
  width?: number;
}

export const Popper: React.FC<PopperProps> = ({
  children,
  content,
  height = 200,
  width = 200,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>(null);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleOpen: React.MouseEventHandler<HTMLDivElement> = e => {
    const getBoundingClientRect = () =>
      ({
        top: e.clientY,
        left: e.clientX,
        bottom: e.clientY,
        right: e.clientX,
        width: 0,
        height: 0,
      } as DOMRect);

    setAnchorEl({ getBoundingClientRect });
    setIsOpen(true);
  };
  return (
    <div
      onMouseOver={handleOpen}
      onMouseLeave={handleClose}
      onClick={handleOpen}
    >
      <MuiPopper
        open={isOpen}
        anchorEl={anchorEl}
        transition
        {...props}
        style={{ zIndex: 1301 }}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={350}>
            <Paper
              sx={{
                width,
                height,
                boxShadow: theme => theme.shadows[7],
                borderRadius: '16px',
              }}
            >
              {content}
            </Paper>
          </Fade>
        )}
      </MuiPopper>
      {children}
    </div>
  );
};
