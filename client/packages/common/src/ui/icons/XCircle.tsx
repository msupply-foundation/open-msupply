import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const XCircleIcon = (props: SvgIconProps): JSX.Element => {
  const combinedProps: SvgIconProps = { color: 'primary', ...props };
  return (
    <SvgIcon {...combinedProps} viewBox="0 0 16 16">
      <path d="M8 .667a7.333 7.333 0 1 1 0 14.666A7.333 7.333 0 0 1 8 .667zM8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zm1.529 3.529a.667.667 0 1 1 .942.942L8.943 8l1.528 1.529c.235.234.258.6.07.86l-.07.082a.667.667 0 0 1-.942 0l-1.53-1.528-1.528 1.528a.667.667 0 0 1-.86.07l-.082-.07a.667.667 0 0 1 0-.942l1.528-1.53-1.528-1.528a.667.667 0 0 1-.07-.86l.07-.082c.26-.26.682-.26.942 0L8 7.057z" />
    </SvgIcon>
  );
};
