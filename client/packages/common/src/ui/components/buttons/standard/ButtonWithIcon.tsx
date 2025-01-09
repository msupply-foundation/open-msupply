import React from 'react';
import { ButtonProps } from '@mui/material';
import { ShrinkableBaseButton } from './ShrinkableBaseButton';

export interface ButtonWithIconProps extends ButtonProps {
  Icon: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  label: string;
  shouldShrink?: boolean;
  variant?: 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'error';
  disabled?: boolean;
  shrinkThreshold?: 'sm' | 'md' | 'lg' | 'xl';
}

export const ButtonWithIcon = React.forwardRef<
  HTMLButtonElement,
  ButtonWithIconProps
>(
  (
    {
      label,
      onClick,
      Icon,
      shouldShrink = true,
      variant = 'outlined',
      color = 'primary',
      disabled,
      shrinkThreshold = 'md',
      ...buttonProps
    },
    ref
  ) => (
    <ShrinkableBaseButton
      disabled={disabled}
      shouldShrink={shouldShrink}
      shrinkThreshold={shrinkThreshold}
      onClick={onClick}
      variant={variant}
      color={color}
      size="small"
      startIcon={Icon}
      ref={ref}
      label={label}
      {...buttonProps}
    />
  )
);
