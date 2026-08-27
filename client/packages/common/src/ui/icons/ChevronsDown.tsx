import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const ChevronsDownIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon
      {...props}
      style={{
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        stroke: 'currentColor',
        fill: 'none',
      }}
      viewBox="0 0 24 24"
    >
      <polyline points="7 13 12 18 17 13"></polyline>
      <polyline points="7 6 12 11 17 6"></polyline>
    </SvgIcon>
  );
};
