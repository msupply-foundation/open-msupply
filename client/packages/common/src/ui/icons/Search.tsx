import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const SearchIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon
      {...props}
      sx={{
        strokeWidth: '2px',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        fill: 'none',
        stroke: 'currentColor',
      }}
      viewBox="0 0 20 21"
    >
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </SvgIcon>
  );
};
