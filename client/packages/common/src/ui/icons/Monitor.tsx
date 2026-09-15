import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const MonitorIcon = (props: SvgIconProps): JSX.Element => {
  const { sx, ...rest } = props;
  return (
    <SvgIcon
      {...rest}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      sx={{ ...sx, fill: 'none' }}
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </SvgIcon>
  );
};
