import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const MailIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon
      {...props}
      style={{
        fill: 'none',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        stroke: 'currentColor',
      }}
      viewBox="0 0 24 24"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </SvgIcon>
  );
};
