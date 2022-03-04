import React, { FC } from 'react';
import { usePopover } from '../../BasePopover';
import {
  PaperClickPopover as ClickPopover,
  PaperClickPopoverProps,
} from './PaperClickPopover';

export const usePaperClickPopover = () => {
  const { show, hide, Popover } = usePopover();
  const PaperClickPopover: FC<
    Omit<PaperClickPopoverProps, 'show' | 'hide' | 'Popover'>
  > = props => (
    <ClickPopover show={show} hide={hide} Popover={Popover} {...props} />
  );

  return { show, hide, PaperClickPopover };
};
