import React from 'react';
import { ButtonProps, CircularProgress } from '@mui/material';
import { BaseButton } from './standard/BaseButton';

export const LoadingButton: React.FC<ButtonProps & { isLoading: boolean }> = ({
  children,
  disabled,
  endIcon,
  isLoading,
  startIcon,
  ...rest
}) => {
  return isLoading ? (
    <BaseButton
      startIcon={<CircularProgress size={20} />}
      disabled
      {...rest}
      sx={{
        '&.Mui-disabled': {
          backgroundColor: 'background.white',
        },
      }}
    />
  ) : (
    <BaseButton
      disabled={disabled}
      endIcon={endIcon}
      startIcon={startIcon}
      {...rest}
    >
      {children}
    </BaseButton>
  );
};
