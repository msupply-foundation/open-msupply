import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const DownloadIcon = (props: SvgIconProps): JSX.Element => {
  const { style, ...rest } = props;
  const combinedProps: SvgIconProps = {
    style: {
      ...style,
      fill: 'none',
    },
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeWidth: 2,
    ...rest,
  };

  return (
    <SvgIcon {...combinedProps} viewBox="0 0 24 24">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      {/* Arrow DOWN */}
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </SvgIcon>
  );
};
