import React from 'react';
import { PaperProps } from '@mui/material/Paper';

export interface PaperPopoverProps {
  Content: React.ReactElement;
  paperProps?: PaperProps;
  width?: number;
  height?: number;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export * from './PaperClickPopover';
export * from './PaperHoverPopover';
export * from './PaperPopoverSection';
export * from './PersistentPaperPopover';
