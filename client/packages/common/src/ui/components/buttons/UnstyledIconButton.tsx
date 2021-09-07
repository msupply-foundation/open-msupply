import React from 'react';
import { IconButton, Tooltip } from '@material-ui/core';
import { LocaleKey, useTranslation } from '../../../intl/intlHelpers';

interface ButtonProps {
  disabled?: boolean;
  icon: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  titleKey: LocaleKey;
}

const UnstyledIconButton: React.FC<ButtonProps> = props => {
  const t = useTranslation();
  const { disabled, icon, onClick, titleKey } = props;
  const tooltip = t(titleKey);
  return (
    <Tooltip title={tooltip}>
      <IconButton disabled={disabled} onClick={onClick} aria-label={tooltip}>
        {icon}
      </IconButton>
    </Tooltip>
  );
};

export default UnstyledIconButton;
