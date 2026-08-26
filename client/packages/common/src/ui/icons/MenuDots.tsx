import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const MenuDotsIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon {...props} viewBox="0 0 21 20">
      <path d="M10 14.167a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm0 1.666a.833.833 0 1 0 0 1.667.833.833 0 0 0 0-1.667zM10 7.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm0 1.667a.833.833 0 1 0 0 1.666.833.833 0 0 0 0-1.666zm0-8.334a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM10 2.5a.833.833 0 1 0 0 1.667.833.833 0 0 0 0-1.667z" />
    </SvgIcon>
  );
};
