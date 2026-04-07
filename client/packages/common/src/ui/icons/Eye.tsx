import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const EyeIcon = (props: SvgIconProps): JSX.Element => (
  <SvgIcon
    {...props}
    viewBox="0 0 24 24"
    strokeWidth="2"
    stroke="currentColor"
    style={{ fill: 'none' }}
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </SvgIcon>
);
