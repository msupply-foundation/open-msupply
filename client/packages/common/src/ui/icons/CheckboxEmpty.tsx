import React from 'react';
import SvgIcon, { SvgIconProps } from '@material-ui/core/SvgIcon';

export const CheckboxEmpty = (props: SvgIconProps): JSX.Element => {
  const combinedProps: SvgIconProps = { color: 'primary', ...props };
  return (
    <SvgIcon {...combinedProps} viewBox="0 0 24 30">
      <path d="M17,5a2.00228,2.00228,0,0,1,2,2V17a2.00228,2.00228,0,0,1-2,2H7a2.00228,2.00228,0,0,1-2-2V7A2.00228,2.00228,0,0,1,7,5H17m0-1H7A3,3,0,0,0,4,7V17a3,3,0,0,0,3,3H17a3,3,0,0,0,3-3V7a3,3,0,0,0-3-3Z" />
    </SvgIcon>
  );
};
