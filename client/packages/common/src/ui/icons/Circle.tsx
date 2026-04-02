import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const CircleIcon = React.forwardRef<SVGSVGElement, SvgIconProps>(
  (props, ref) => {
    return (
      <SvgIcon ref={ref} viewBox="0 0 20 20" {...props}>
        <circle cx="10" cy="10" r="10" />
      </SvgIcon>
    );
  }
);
