import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const ChevronDownIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M12 13.586 6.707 8.293a1 1 0 0 0-1.414 1.414l6 6a1 1 0 0 0 1.414 0l6-6a1 1 0 1 0-1.414-1.414L12 13.586z" />
    </SvgIcon>
  );
};
