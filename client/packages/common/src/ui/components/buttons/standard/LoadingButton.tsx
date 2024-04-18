import React from 'react';
import { ButtonProps, CircularProgress } from '@mui/material';
import { BaseButton } from './BaseButton';

export const LoadingButton: React.FC<
  ButtonProps & {
    isLoading: boolean;
    loadingStyle?: { backgroundColor?: string; iconColor?: string };
  }
> = ({
  children,
  disabled,
  endIcon,
  isLoading,
  startIcon,
  loadingStyle,
  ...rest
}) => {
  return isLoading ? (
    <BaseButton
      startIcon={
        <CircularProgress size={20} sx={{ color: loadingStyle?.iconColor }} />
      }
      disabled
      {...rest}
      sx={{
        '&.Mui-disabled': {
          backgroundColor: loadingStyle?.backgroundColor ?? 'background.white',
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
