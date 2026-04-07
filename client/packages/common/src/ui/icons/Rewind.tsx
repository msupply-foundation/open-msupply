import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const RewindIcon = (props: SvgIconProps): JSX.Element => {
  const combinedProps: SvgIconProps = {
    style: {
      fill: 'none',
    },
    stroke: 'currentColor',
    ...props,
  };

  return (
    <SvgIcon {...combinedProps} viewBox="0 0 24 24" strokeWidth="2">
      <polyline points="1 4 1 10 7 10"></polyline>
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
    </SvgIcon>
  );
};
