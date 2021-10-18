import React from 'react';
import { IconButton as MuiIconButton, Tooltip } from '@mui/material';
import { LocaleKey, useTranslation } from '../../../intl/intlHelpers';

interface ButtonProps {
  disabled?: boolean;
  icon: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  labelKey: LocaleKey;
}

export const IconButton: React.FC<ButtonProps> = ({
  disabled,
  icon,
  onClick,
  labelKey,
}) => {
  const t = useTranslation();

  const tooltip = t(labelKey);
  return (
    <Tooltip title={tooltip}>
      <MuiIconButton
        disabled={disabled}
        onClick={onClick}
        aria-label={tooltip}
        size="large"
      >
        {icon}
      </MuiIconButton>
    </Tooltip>
  );
};
