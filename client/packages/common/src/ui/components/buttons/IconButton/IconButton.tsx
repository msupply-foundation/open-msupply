import React from 'react';
import { IconButton as MuiIconButton, Tooltip } from '@mui/material';

interface ButtonProps {
  disabled?: boolean;
  icon: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  label: string;
  width?: string;
  height?: string;
}

export const IconButton: React.FC<ButtonProps> = ({
  disabled,
  icon,
  onClick,
  label,
  width,
  height,
}) => (
  <Tooltip title={label}>
    <MuiIconButton
      sx={{ width, height }}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      size="small"
    >
      {icon}
    </MuiIconButton>
  </Tooltip>
);
