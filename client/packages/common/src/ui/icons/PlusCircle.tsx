import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';
import * as React from 'react';

export const PlusCircleIcon: React.FC<SvgIconProps> = props => (
  <SvgIcon
    viewBox="0 0 24 24"
    {...props}
    sx={{ fill: 'none' }}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="16"></line>
    <line x1="8" y1="12" x2="16" y2="12"></line>
  </SvgIcon>
);
