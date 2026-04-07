import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const FileUploadIcon = (props: SvgIconProps): JSX.Element => {
  const combinedProps: SvgIconProps = {
    style: {
      fill: 'none',
    },
    stroke: 'currentColor',
    ...props,
  };
  return (
    <SvgIcon
      {...combinedProps}
      viewBox="0 0 24 24"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 22H6a2 2 0 0 1 -2 -2 v-16a2 2 0 0 1 2 -2h7l7 7v11a2 2 0 0 1 -2 2h-3"></path>
      <g transform="translate(0,8)">
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
      </g>
    </SvgIcon>
  );
};
