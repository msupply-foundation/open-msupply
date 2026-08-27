import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const DeleteIcon = (props: SvgIconProps): JSX.Element => {
  const combinedProps: SvgIconProps = {
    style: {
      fill: 'none',
    },
    stroke: 'currentColor',
    ...props,
  };
  return (
    <SvgIcon {...combinedProps} viewBox="0 0 24 24" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </SvgIcon>
  );
};
