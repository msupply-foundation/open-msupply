import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const AlertIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon
      {...props}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ fill: 'none' }}
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </SvgIcon>
  );
};
