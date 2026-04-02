import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const FilterIcon = React.forwardRef<SVGSVGElement, SvgIconProps>(
  (props, ref) => {
    const combinedProps: SvgIconProps = {
      fill: 'currentColor',
      ...props,
    };
    return (
      <SvgIcon ref={ref} {...combinedProps} viewBox="0 0 24 24">
        <path d="M0 0h24v24H0z" fill="none" />
        <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
      </SvgIcon>
    );
  }
);
