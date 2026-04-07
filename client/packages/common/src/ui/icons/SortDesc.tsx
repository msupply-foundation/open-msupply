import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const SortDescIcon = (props: SvgIconProps): JSX.Element => {
  const combinedProps: SvgIconProps = {
    style: {
      fill: 'none',
      height: 24,
      width: 24,
    },
    stroke: '#555770',
    ...props,
  };
  return (
    <SvgIcon {...combinedProps} viewBox="0,0,24,24">
      <path d="M12,15 C12,15,8,9,8,9 C8,9,16,9,16,9 C16,9,12,15,12,15 Z" />
    </SvgIcon>
  );
};
