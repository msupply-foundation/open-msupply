import React, { FC, PropsWithChildren } from 'react';
import { ClickPopover, ClickPopoverProps } from '../../ClickPopover';
import Paper, { PaperProps } from '@mui/material/Paper';

export interface PaperClickPopoverProps extends ClickPopoverProps {
  height?: number;
  paperProps?: PaperProps;
  width?: number;
}

export const PaperClickPopover: FC<
  PropsWithChildren<PaperClickPopoverProps>
> = ({
  children,
  Content,
  paperProps,
  placement = 'left',
  Popover,
  width,
  height,
  show,
  hide,
  className,
}) => {
  return (
    <ClickPopover
      hide={hide}
      show={show}
      Popover={Popover}
      placement={placement}
      className={className}
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
    </ClickPopover>
  );
};
