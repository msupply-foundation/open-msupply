import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const CloseIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon {...props} viewBox="0 0 21 20">
      <path d="M14.41 4.41a.833.833 0 0 1 1.18 1.18L11.177 10l4.411 4.41a.834.834 0 0 1 .075 1.094l-.075.085a.833.833 0 0 1-1.178 0L10 11.178l-4.41 4.411a.834.834 0 0 1-1.094.075l-.085-.075a.833.833 0 0 1 0-1.178L8.82 10l-4.41-4.41a.834.834 0 0 1-.075-1.094l.075-.085a.833.833 0 0 1 1.178 0L10 8.82z" />
    </SvgIcon>
  );
};
