import React from 'react';
import { IconButton as MuiIconButton, Tooltip } from '@mui/material';
import { LocaleKey, useTranslation } from '../../../intl';

interface ButtonProps {
  disabled?: boolean;
  icon: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  labelKey: LocaleKey;
  width?: string;
  height?: string;
}

export const IconButton: React.FC<ButtonProps> = ({
  disabled,
  icon,
  onClick,
  labelKey,
  width,
  height,
}) => {
  const t = useTranslation();

  const tooltip = t(labelKey);
  return (
    <Tooltip title={tooltip}>
      <MuiIconButton
        sx={{ width, height }}
        disabled={disabled}
        onClick={onClick}
        aria-label={tooltip}
        size="small"
      >
        {icon}
      </MuiIconButton>
    </Tooltip>
  );
};
