import React from 'react';
import {
  Button,
  IconButton as MuiIconButton,
  SxProps,
  Tooltip,
} from '@mui/material';

interface ButtonProps {
  disabled?: boolean;
  icon: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  label: string;
  width?: string;
  height?: string;
  color?: 'primary' | 'secondary' | 'error' | undefined;
  sx?: SxProps;
  className?: string;
  showLabel?: boolean;
}

export const IconButton: React.FC<ButtonProps> = ({
  disabled,
  icon,
  onClick,
  label,
  width,
  height,
  color,
  sx,
  className,
  showLabel,
}) =>
  showLabel ? (
    <Button
      disabled={disabled}
      onClick={onClick}
      variant="text"
      size="small"
      color={color ?? 'inherit'}
      startIcon={icon}
      sx={{ textTransform: 'none', ...sx }}
      className={className}
    >
      {label}
    </Button>
  ) : (
    <Tooltip title={disabled ? '' : label}>
      <MuiIconButton
        sx={{ width, height, ...sx }}
        disabled={disabled}
        onClick={onClick}
        aria-label={label}
        size="small"
        color={color}
        className={className}
      >
        {icon}
      </MuiIconButton>
    </Tooltip>
  );
