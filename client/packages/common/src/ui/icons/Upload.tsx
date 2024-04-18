import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const UploadIcon = (props: SvgIconProps): JSX.Element => {
  const { style, ...rest } = props;
  const combinedProps: SvgIconProps = {
    style: {
      ...style,
      fill: 'none',
    },
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeWidth: 2,
    ...rest,
  };

  return (
    <SvgIcon {...combinedProps} viewBox="0 0 24 24">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="17 8 12 3 7 8"></polyline>
      <line x1="12" y1="3" x2="12" y2="15"></line>
    </SvgIcon>
  );
};
