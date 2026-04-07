import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const MessageSquareIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon
      {...props}
      sx={{
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        stroke: 'currentColor',
        fill: 'none',
        ...props.sx,
      }}
      viewBox="0 0 24 24"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </SvgIcon>
  );
};
