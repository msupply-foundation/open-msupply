import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const EditIcon = (props: SvgIconProps): JSX.Element => {
  const { style, ...rest } = props;
  const combinedProps: SvgIconProps = {
    style: {
      ...style,
      fill: 'none',
    },
    stroke: 'currentColor',
    ...rest,
  };
  return (
    <SvgIcon {...combinedProps} viewBox="0 0 24 24" strokeWidth="2">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </SvgIcon>
  );
};
