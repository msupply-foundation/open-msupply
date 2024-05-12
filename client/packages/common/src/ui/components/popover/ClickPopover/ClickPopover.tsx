import React, { MouseEventHandler, PropsWithChildren } from 'react';
import { CloseIcon } from '@common/icons';
import { Box, IconButton } from '@mui/material';
import { BasePopoverProps } from '../BasePopover';

export interface ClickPopoverProps {
  Content: React.ReactElement;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  Popover: React.FC<Partial<PropsWithChildren<BasePopoverProps>>>;
  show: MouseEventHandler<HTMLDivElement | HTMLButtonElement>;
  hide: () => void;
  className?: string;
}

export const ClickPopover: React.FC<PropsWithChildren<ClickPopoverProps>> = ({
  children,
  Content,
  placement = 'left',
  show,
  hide,
  Popover,
  className,
}) => (
  <>
    <div style={{ cursor: 'pointer' }} onClick={show} className={className}>
      {children}
    </div>
    <Popover placement={placement}>
      <Box>
        <IconButton
          color="primary"
          onClick={hide}
          size="small"
          style={{ position: 'absolute', right: 0, top: 0 }}
        >
          <CloseIcon />
        </IconButton>
        {Content}
      </Box>
    </Popover>
  </>
);
