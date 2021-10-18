import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const HomeIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon {...props} viewBox="0 0 16 16">
      <path d="M3.333 15.333a2 2 0 0 1-2-2V6c0-.206.095-.4.258-.526l6-4.667a.667.667 0 0 1 .818 0l6 4.667c.163.126.258.32.258.526v7.333a2 2 0 0 1-2 2H3.333zM8 2.178 2.667 6.326v7.007c0 .369.298.667.666.667h2V8c0-.335.247-.612.568-.66L6 7.334h4c.368 0 .667.299.667.667v6h2a.667.667 0 0 0 .666-.667V6.326L8 2.178zm1.333 6.489H6.667V14h2.666V8.667z" />
    </SvgIcon>
  );
};
