import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const ThermometerIcon = ({ ...props }: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon
      {...props}
      style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 3 }}
      viewBox="0 0 28 64"
    >
      <path d="M14,0 C9.9,0,6.5,3.2,6.5,7.2 L6.5,37.7 C2.4,40.2,0,44.1,0,48.6 C0,56,6.3,62,14,62 C21.7,62,28,56,28,48.6 C28,44.1,25.6,40.2,21.5,37.7 L21.5,7.2 C21.5,3.2,18.1,0,14,0 Z M26,48.6 C26,54.9,20.6,60,14,60 C7.4,60,2,54.9,2,48.6 C2,44.6,4.1,41.3,8,39.1 C8.3,38.9,8.5,38.6,8.5,38.2 L8.5,7.2 C8.5,4.3,11,2,14,2 C17,2,19.5,4.3,19.5,7.2 L19.5,11.2 L14.5,11.2 L14.5,13.2 L19.5,13.2 L19.5,21.2 L14.5,21.2 L14.5,23.2 L19.5,23.2 L19.5,31.2 L14.5,31.2 L14.5,33.2 L19.5,33.2 L19.5,38.3 C19.5,38.7,19.7,39,20,39.2 C23.9,41.3,26,44.6,26,48.6 Z" />
    </SvgIcon>
  );
};
