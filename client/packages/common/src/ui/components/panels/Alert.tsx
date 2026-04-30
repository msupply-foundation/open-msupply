import React from 'react';
import { AlertColor, AlertProps, Alert as MuiAlert } from '@mui/material';
import { AlertIcon, CheckIcon, InfoIcon } from '@common/icons';

export const Alert = (props: AlertProps & { Icon?: React.JSX.Element }) => {
  const { sx, Icon, ...rest } = props;
  return (
    <MuiAlert icon={Icon} {...rest} sx={{ borderRadius: '10px', ...sx }} />
  );
};

export { AlertColor };
