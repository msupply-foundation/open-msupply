import React from 'react';
import { AlertColor, AlertProps, Alert as MuiAlert } from '@mui/material';
import { AlertIcon, CheckIcon, InfoIcon } from '@common/icons';

const getIcon = (severity: AlertColor | undefined) => {
  switch (severity) {
    case 'info':
      return <InfoIcon fontSize="small" sx={{ color: 'info.main' }} />;
    case 'success':
      return <CheckIcon fontSize="small" sx={{ color: 'success.main' }} />;
    case 'warning':
      return <AlertIcon fontSize="small" sx={{ color: 'warning.main' }} />;
    case 'error':
    default:
      return undefined;
  }
};

export const Alert = (props: AlertProps) => {
  const { sx, ...rest } = props;
  const Icon = getIcon(props.severity);
  return (
    <MuiAlert icon={Icon} {...rest} sx={{ borderRadius: '10px', ...sx }} />
  );
};

export { AlertColor };
