import React from 'react';
import SvgIcon, { SvgIconProps } from '@material-ui/core/SvgIcon';

export const Circle = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon viewBox="0 0 20 20" {...props}>
      <circle cx="10" cy="10" r="10" />
    </SvgIcon>
  );
};
