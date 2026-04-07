import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const ExternalLinkIcon = (props: SvgIconProps): JSX.Element => {
  const { sx, ...rest } = props;
  return (
    <SvgIcon
      {...rest}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      viewBox="0 0 24 24"
      sx={{ ...sx, fill: 'none' }}
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
      <polyline points="15 3 21 3 21 9"></polyline>
      <line x1="10" y1="14" x2="21" y2="3"></line>
    </SvgIcon>
  );
};
