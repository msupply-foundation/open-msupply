import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const ListIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon
      {...props}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      viewBox="0 0 21 20"
    >
      <line x1="8" y1="6" x2="21" y2="6"></line>
      <line x1="8" y1="12" x2="21" y2="12"></line>
      <line x1="8" y1="18" x2="21" y2="18"></line>
      <line x1="3" y1="6" x2="3.01" y2="6"></line>
      <line x1="3" y1="12" x2="3.01" y2="12"></line>
      <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </SvgIcon>
  );
};
