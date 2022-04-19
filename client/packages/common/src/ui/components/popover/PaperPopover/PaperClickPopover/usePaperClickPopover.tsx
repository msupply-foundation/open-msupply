import React, { FC, PropsWithChildren } from 'react';
import { usePopover } from '../../BasePopover';
import {
  PaperClickPopover as ClickPopover,
  PaperClickPopoverProps,
} from './PaperClickPopover';

export const usePaperClickPopover = () => {
  const { show, hide, Popover } = usePopover({
    hideDebounceDelay: 0,
    showDebounceDelay: 0,
  });
  const PaperClickPopover: FC<
    PropsWithChildren<Omit<PaperClickPopoverProps, 'show' | 'hide' | 'Popover'>>
  > = props => (
    <ClickPopover show={show} hide={hide} Popover={Popover} {...props} />
  );

  return { show, hide, PaperClickPopover };
};
