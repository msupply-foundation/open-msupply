import React from 'react';
import { usePopover } from '../BasePopover';

export interface PopoverProps {
  Content: React.ReactElement<any, any>;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export const HoverPopover: React.FC<PopoverProps> = ({
  children,
  Content,
  placement = 'left',
}) => {
  const { show, hide, Popover } = usePopover();

  return (
    <div
      style={{ cursor: 'help' }}
      onMouseOver={show}
      onMouseLeave={hide}
      onClick={show}
    >
      <Popover placement={placement}>{Content}</Popover>
      {children}
    </div>
  );
};
