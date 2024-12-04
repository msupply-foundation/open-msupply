import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const MaximiseIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon
      {...props}
      style={{
        fill: 'none',
        strokeWidth: 2,
        stroke: 'currentColor',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }}
      viewBox="0 0 24 24"
    >
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </SvgIcon>
  );
};
