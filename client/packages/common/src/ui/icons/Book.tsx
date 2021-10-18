import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const BookIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon {...props} viewBox="0 0 21 20">
      <path d="M16.667.833c.46 0 .833.373.833.834v16.666c0 .46-.373.834-.833.834H5.417c-1.611 0-2.917-1.306-2.917-2.917V3.75C2.5 2.14 3.806.833 5.417.833h11.25zM15.833 15L5.417 15c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25h10.416V15zm0-12.499H5.417c-.69 0-1.25.56-1.25 1.25v9.864c.378-.18.802-.28 1.25-.28h10.416V2.5z" />
    </SvgIcon>
  );
};
