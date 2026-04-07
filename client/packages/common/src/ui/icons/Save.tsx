import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const SaveIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon {...props} viewBox="0 0 16 16">
      <path d="M10.667 1.333c.176 0 .346.07.471.196l3.333 3.333a.667.667 0 0 1 .196.471v7.334a2 2 0 0 1-2 2H3.333a2 2 0 0 1-2-2V3.333a2 2 0 0 1 2-2h7.334zm-.276 1.334H5.333v2H10A.667.667 0 0 1 10 6H4.667A.667.667 0 0 1 4 5.333V2.666h-.667a.667.667 0 0 0-.666.667v9.334c0 .368.298.666.666.666H4L4 8.667c0-.335.247-.612.568-.66L4.667 8h6.666c.369 0 .667.298.667.667v4.666h.667a.667.667 0 0 0 .666-.666V5.609l-2.942-2.942zm.276 6.666H5.333v4h5.333v-4z" />
    </SvgIcon>
  );
};
