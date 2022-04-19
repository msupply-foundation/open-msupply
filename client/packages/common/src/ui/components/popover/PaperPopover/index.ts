import React from 'react';
import { PaperProps } from '@mui/material/Paper';

export interface PaperPopoverProps {
  Content: React.ReactElement<any, any>;
  paperProps?: PaperProps;
  width?: number;
  height?: number;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children?: React.ReactNode;
}

export * from './PaperClickPopover';
export * from './PaperHoverPopover';
export * from './PaperPopoverSection';
