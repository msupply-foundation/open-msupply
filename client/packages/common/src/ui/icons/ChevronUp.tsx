import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const ChevronUpIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon
      {...props}
      viewBox="0 0 24 24"
      style={{
        stroke: 'currentColor',
      }}
    >
      <polyline points="18 15 12 9 6 15"></polyline>
    </SvgIcon>
  );
};
