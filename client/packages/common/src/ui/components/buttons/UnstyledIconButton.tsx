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
  return (
    <Tooltip title={t(titleKey)}>
      <IconButton disabled={disabled} onClick={onClick}>
        {icon}
      </IconButton>
    </Tooltip>
  );
};

export default UnstyledIconButton;
