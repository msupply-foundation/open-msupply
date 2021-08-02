import React from 'react';
import SvgIcon, { SvgIconProps } from '@material-ui/core/SvgIcon';

export const Tools = (props: SvgIconProps): JSX.Element => {
  const combinedProps: SvgIconProps = { color: 'primary', ...props };
  return (
    <SvgIcon {...combinedProps} viewBox="0 0 16 20">
      <path d="M8,15c-0.071,0-0.141-0.015-0.207-0.045C7.557,14.848,2,12.272,2,8V3.5c0-0.21,0.131-0.398,0.329-0.47l5.5-2   c0.11-0.04,0.23-0.04,0.342,0l5.5,2C13.868,3.102,14,3.29,14,3.5V8c0,4.272-5.557,6.848-5.793,6.955C8.142,14.985,8.07,15,8,15z    M3,3.85V8c0,3.208,4.031,5.451,5,5.943c0.969-0.492,5-2.735,5-5.943V3.85L8,2.032L3,3.85z" />
    </SvgIcon>
  );
};
