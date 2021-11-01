import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const SidebarIcon = (props: SvgIconProps): JSX.Element => {
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
      viewBox="0 0 20 24"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="9" y1="3" x2="9" y2="21"></line>
    </SvgIcon>
  );
};
