import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const ZapIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon {...props} viewBox="0 0 20 20">
      <path d="M9.058 12.503H2.502a.833.833 0 0 1-.64-1.367l8.333-10c.532-.64 1.57-.189 1.467.637l-.716 5.73h6.556a.833.833 0 0 1 .64 1.367l-8.334 10c-.532.639-1.57.188-1.467-.637l.717-5.73zM4.28 10.836H10c.502 0 .89.44.827.937l-.48 3.846 5.374-6.45h-5.72a.833.833 0 0 1-.827-.936l.48-3.847-5.374 6.45z" />
    </SvgIcon>
  );
};
