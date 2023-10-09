import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const ThermometerIcon = ({ ...props }: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon
      {...props}
      style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}
      viewBox="0 0 24 24"
    >
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path>
    </SvgIcon>
  );
};
