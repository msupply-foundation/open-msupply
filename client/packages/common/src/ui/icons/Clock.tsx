import React from 'react';
import SvgIcon, { SvgIconProps } from '@material-ui/core/SvgIcon';

export const Clock = (props: SvgIconProps): JSX.Element => {
  const combinedProps: SvgIconProps = {
    color: 'primary',
    style: {
      fill: 'none',
    },
    stroke: 'currentColor',
    ...props,
  };

  return (
    <SvgIcon {...combinedProps} viewBox="0 0 24 24" strokeWidth="2">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </SvgIcon>
  );
};
