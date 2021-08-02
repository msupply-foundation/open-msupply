import React from 'react';
import SvgIcon, { SvgIconProps } from '@material-ui/core/SvgIcon';

export const Dashboard = (props: SvgIconProps): JSX.Element => {
  const combinedProps: SvgIconProps = { color: 'primary', ...props };
  return (
    <SvgIcon {...combinedProps} viewBox="0 0 25 31.25">
      <path d="M10.33,5.68v6.2a1.5,1.5,0,0,1-1.5,1.5H5.68a1.5,1.5,0,0,1-1.5-1.5V5.68a1.5,1.5,0,0,1,1.5-1.5H8.83A1.5,1.5,0,0,1,10.33,5.68Zm-1.5,8.84H5.68a1.5,1.5,0,0,0-1.5,1.5v3.3a1.5,1.5,0,0,0,1.5,1.5H8.83a1.5,1.5,0,0,0,1.5-1.5v-3.3A1.5,1.5,0,0,0,8.83,14.52Zm10.49-3.69H12.97a1.5,1.5,0,0,0-1.5,1.5v6.99a1.5,1.5,0,0,0,1.5,1.5h6.35a1.5,1.5,0,0,0,1.5-1.5V12.33A1.5,1.5,0,0,0,19.32,10.83Zm0-6.65H12.97a1.5,1.5,0,0,0-1.5,1.5V8.19a1.5,1.5,0,0,0,1.5,1.5h6.35a1.5,1.5,0,0,0,1.5-1.5V5.68A1.5,1.5,0,0,0,19.32,4.18Z" />
    </SvgIcon>
  );
};
