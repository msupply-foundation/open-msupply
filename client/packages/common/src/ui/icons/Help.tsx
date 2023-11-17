import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const HelpIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon
      {...props}
      style={{
        fill: 'currentColor',
        strokeWidth: 2.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }}
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="#fff"></path>
      <line x1="12" y1="17" x2="12.01" y2="17" stroke="#fff"></line>
    </SvgIcon>
  );
};
