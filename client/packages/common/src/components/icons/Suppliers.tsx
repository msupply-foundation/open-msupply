import React from 'react';
import SvgIcon, { SvgIconProps } from '@material-ui/core/SvgIcon';

export const Suppliers = (props: SvgIconProps): JSX.Element => {
  const combinedProps: SvgIconProps = { color: 'primary', ...props };
  return (
    <SvgIcon {...combinedProps} viewBox="0 0 512 640">
      <path d="M395.6,106c-2.3-3-5.8-5-9.6-5H126c-3.8,0-7.3,2-9.6,5l-94,123.9c-1.6,2.1-2.4,4.7-2.4,7.4v121.3   c0,28.7,23.3,52.4,52,52.4h368c28.7,0,52-23.8,52-52.4V237.2c0-2.6-0.9-5.3-2.4-7.4L395.6,106z M132,125H380l76.3,101H386   c-4.4,0-8.4,2.4-10.5,6.2l-23.3,42.4c-4.9,8.9-14.3,14.4-24.5,14.4H184.4c-10.2,0-19.6-5.5-24.5-14.4l-23.3-42.4   c-2.1-3.8-6.1-6.2-10.5-6.2H55.6L132,125z M468,358.6c0,15.4-12.6,28.4-28,28.4H72c-15.4,0-28-13-28-28.4V250h74.9l19.9,36.1   c9.1,16.6,26.6,26.9,45.6,26.9h143.2c19,0,36.4-10.2,45.6-26.9l19.9-36.1H468V358.6z" />
    </SvgIcon>
  );
};
