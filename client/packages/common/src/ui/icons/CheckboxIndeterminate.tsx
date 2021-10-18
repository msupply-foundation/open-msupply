import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const CheckboxIndeterminateIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon {...props} viewBox="3 3 20 20">
      <path d="M17,4H7A3,3,0,0,0,4,7V17a3,3,0,0,0,3,3H17a3,3,0,0,0,3-3V7A3,3,0,0,0,17,4Zm-1,9H8a1,1,0,0,1,0-2h8a1,1,0,0,1,0,2Z" />
    </SvgIcon>
  );
};
