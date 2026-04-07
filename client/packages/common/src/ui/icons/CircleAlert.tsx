import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const CircleAlertIcon = (
  props: SvgIconProps & { fill?: string }
): JSX.Element => {
  const { fill = 'none', ...rest } = props;
  return (
    <SvgIcon
      {...rest}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ fill }}
    >
      <circle cx="12" cy="12" r="12" />
      <g transform="scale(0.6 0.6) matrix(1 0 0 1 7.5 6)">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </g>
    </SvgIcon>
  );
};
