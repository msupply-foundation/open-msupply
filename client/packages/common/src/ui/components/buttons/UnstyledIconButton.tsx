import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { LocaleKey, useTranslation } from '../../../intl/intlHelpers';

interface ButtonProps {
  disabled?: boolean;
  icon: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  titleKey: LocaleKey;
}

export const UnstyledIconButton: React.FC<ButtonProps> = ({
  disabled,
  icon,
  onClick,
  titleKey,
}) => {
  const t = useTranslation();

  const tooltip = t(titleKey);
  return (
    <Tooltip title={tooltip}>
      <IconButton
        sx={{ padding: 0 }}
        disabled={disabled}
        onClick={onClick}
        aria-label={tooltip}
        size="large"
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
};
