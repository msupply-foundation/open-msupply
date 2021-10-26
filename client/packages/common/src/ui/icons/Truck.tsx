import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const TruckIcon = ({ ...props }: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon
      {...props}
      viewBox="0 0 24 24"
      style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}
    >
      <rect x="1" y="3" width="15" height="13"></rect>
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
      <circle cx="5.5" cy="18.5" r="2.5"></circle>
      <circle cx="18.5" cy="18.5" r="2.5"></circle>
    </SvgIcon>
  );
};
