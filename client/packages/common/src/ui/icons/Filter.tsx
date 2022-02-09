import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const FilterIcon = (props: SvgIconProps): JSX.Element => {
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
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    </SvgIcon>
  );
};
