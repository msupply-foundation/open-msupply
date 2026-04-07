import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const UserCircleIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="12" />
      <g transform="translate(4 4)">
        <path
          d="M10.667 9.333A3.333 3.333 0 0 1 14 12.667V14a.667.667 0 0 1-1.333 0v-1.333a2 2 0 0 0-2-2H5.333a2 2 0 0 0-2 2V14A.667.667 0 0 1 2 14v-1.333a3.333 3.333 0 0 1 3.333-3.334zM8 1.333A3.333 3.333 0 1 1 8 8a3.333 3.333 0 0 1 0-6.667zm0 1.334a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"
          fill={props.stroke}
          strokeWidth={0}
        />
      </g>
    </SvgIcon>
  );
};
