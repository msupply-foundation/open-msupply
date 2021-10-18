import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const SortAscIcon = (props: SvgIconProps): JSX.Element => {
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
      <path d="M12,9 C12,9,16,15,16,15 C16,15,8,15,8,15 C8,15,12,9,12,9 Z" />
    </SvgIcon>
  );
};
