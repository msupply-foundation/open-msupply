import React from 'react';
import SvgIcon, { SvgIconProps } from '@material-ui/core/SvgIcon';

export const Circle = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon {...props} viewBox="0 0 21 20">
      <circle cx="12" cy="12" r="10"></circle>
    </SvgIcon>
  );
};
