import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';
import * as React from 'react';

export const PlusCircleIcon: React.FC<SvgIconProps> = props => (
  <SvgIcon viewBox="0 0 21 20.5" {...props}>
    <path d="M14.7 10c0 .552-.47 1-1.05 1h-2.1v2c0 .552-.47 1-1.05 1-.58 0-1.05-.448-1.05-1v-2h-2.1c-.58 0-1.05-.448-1.05-1s.47-1 1.05-1h2.1V7c0-.552.47-1 1.05-1 .58 0 1.05.448 1.05 1v2h2.1c.58 0 1.05.448 1.05 1m-4.2 8c-4.632 0-8.4-3.589-8.4-8s3.768-8 8.4-8c4.632 0 8.4 3.589 8.4 8s-3.768 8-8.4 8m0-18C4.7 0 0 4.477 0 10s4.7 10 10.5 10S21 15.523 21 10 16.3 0 10.5 0" />
  </SvgIcon>
);
