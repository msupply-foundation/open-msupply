import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const CameraIcon = (props: SvgIconProps): JSX.Element => {
  const combinedProps: SvgIconProps = {
    style: {
      fill: 'none',
    },
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...props,
  };
  return (
    <SvgIcon {...combinedProps} viewBox="0 0 24 24">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
      <circle cx="12" cy="13" r="4"></circle>
    </SvgIcon>
  );
};
