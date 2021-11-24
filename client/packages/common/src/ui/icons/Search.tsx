import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const SearchIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon {...props} viewBox="0 0 16 16">
      <path d="M7 1.333a5.667 5.667 0 0 1 4.45 9.175l3.021 3.02a.667.667 0 0 1-.942.943l-3.02-3.02A5.667 5.667 0 1 1 7 1.333zm0 1.334a4.333 4.333 0 1 0 3.044 7.417l.018-.022A4.306 4.306 0 0 0 11.333 7 4.333 4.333 0 0 0 7 2.667z" />
    </SvgIcon>
  );
};
