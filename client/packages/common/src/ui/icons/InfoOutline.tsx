import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const InfoOutlineIcon = (props: SvgIconProps): JSX.Element => {
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
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </SvgIcon>
  );
};
