import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';
import * as React from 'react';

export const MinusIcon: React.FC<SvgIconProps> = props => (
  <SvgIcon
    viewBox="0 0 24 24"
    {...props}
    sx={{ fill: 'none' }}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="8" y1="12" x2="16" y2="12"></line>
  </SvgIcon>
);
