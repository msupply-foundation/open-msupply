import React, { FC, PropsWithChildren } from 'react';
import Fade from '@mui/material/Fade';
import Popper, { PopperProps } from '@mui/material/Popper';
import { useAppTheme } from '@common/styles';

export interface BasePopoverProps extends Omit<PopperProps, 'open'> {
  isOpen: boolean;
  anchorEl: PopperProps['anchorEl'];
  width?: number;
  height?: number;
}

export const BasePopover: FC<PropsWithChildren<BasePopoverProps>> = ({
  children,
  isOpen,
  anchorEl,
  ...popperProps
}) => {
  const theme = useAppTheme();

  return (
    <Popper
      open={isOpen}
      anchorEl={anchorEl}
      transition
      placement="bottom-start"
      style={{
        zIndex: theme.zIndex.tooltip,
      }}
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
