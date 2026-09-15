import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const CheckIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon {...props} viewBox="0 0 16 16">
      <path d="M3.138 8.195a.667.667 0 1 0-.943.943l3.334 3.333c.26.26.682.26.942 0l7.334-7.333a.667.667 0 0 0-.943-.943L6 11.057 3.138 8.195z" />
    </SvgIcon>
  );
};
