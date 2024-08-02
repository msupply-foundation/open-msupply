import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const BarChart2Icon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon
      {...props}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="18" y1="20" x2="18" y2="10"></line>
      <line x1="12" y1="20" x2="12" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="14"></line>
    </SvgIcon>
  );
};
