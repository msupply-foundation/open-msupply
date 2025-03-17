import React from 'react';
import { ButtonProps, CircularProgress } from '@mui/material';
import { BaseButton } from './BaseButton';
import { ShrinkableBaseButton } from './ShrinkableBaseButton';

export const LoadingButton: React.FC<
  ButtonProps & {
    color?: 'primary' | 'secondary' | 'error';

    isLoading: boolean;
    label: string;
    loadingStyle?: { backgroundColor?: string; iconColor?: string };
    shouldShrink?: boolean;
    shrinkThreshold?: 'sm' | 'md' | 'lg' | 'xl';
  }
> = ({
  children,
  color = 'primary',
  variant = 'outlined',
  disabled,
  endIcon,
  isLoading,
  startIcon,
  label,
  loadingStyle,
  shouldShrink = true,
  shrinkThreshold = 'md',
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
    <ShrinkableBaseButton
      color={color}
      label={label}
      disabled={disabled}
      endIcon={endIcon}
      startIcon={startIcon}
      shouldShrink={shouldShrink}
      shrinkThreshold={shrinkThreshold}
      variant={variant}
      {...rest}
    >
      {children}
    </ShrinkableBaseButton>
  );
};
