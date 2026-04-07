import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const ArrowRightIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon {...props} viewBox="0 0 16 16">
      <path d="M8.862 3.529c.26-.26.682-.26.943 0l4 4a.68.68 0 0 1 .176.314.672.672 0 0 1-.176.628l.053-.06a.67.67 0 0 1-.04.046l-.013.014-4 4a.667.667 0 0 1-.943-.942l2.861-2.863H2.667a.667.667 0 0 1-.66-.567L2 8c0-.368.298-.667.667-.667h9.056L8.862 4.47a.667.667 0 0 1-.07-.86z" />
    </SvgIcon>
  );
};
