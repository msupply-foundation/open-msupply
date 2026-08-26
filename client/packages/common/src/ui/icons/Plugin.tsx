import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const PluginIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon
      {...props}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ fill: 'none' }}
    >
      <path d="M9 2v6" />
      <path d="M15 2v6" />
      <path d="M5 8h14v3a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5z" />
      <path d="M12 16v6" />
    </SvgIcon>
  );
};
