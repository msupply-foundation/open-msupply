import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const CheckboxCheckedIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon {...props} viewBox="3 3 20 20">
      <path d="M17,4H7A3,3,0,0,0,4,7V17a3,3,0,0,0,3,3H17a3,3,0,0,0,3-3V7A3,3,0,0,0,17,4Zm-.186,4.581-5,7a1.00147,1.00147,0,0,1-.73144.416C11.05469,15.999,11.02734,16,11,16a.99856.99856,0,0,1-.707-.293l-3-3A.99989.99989,0,0,1,8.707,11.293l2.16553,2.165L15.186,7.419A1.00008,1.00008,0,0,1,16.814,8.58105Z" />
    </SvgIcon>
  );
};
