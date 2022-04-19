import React from 'react';
import { usePopover } from '../BasePopover';

interface PopoverProps {
  Content: React.ReactElement<any, any>;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children?: React.ReactNode;
}

export const HoverPopover: React.FC<PopoverProps> = ({
  children,
  Content,
  placement = 'left',
}) => {
  const { show, hide, Popover } = usePopover();

  return (
    <>
      <div
        style={{ cursor: 'help' }}
        onMouseOver={show}
        onMouseLeave={hide}
        onClick={show}
      >
        {children}
      </div>
      <Popover placement={placement}>{Content}</Popover>
    </>
  );
};
