import React from 'react';
import { Button, Tooltip } from '@material-ui/core';
import { styled } from '@material-ui/styles';
import { LocaleKey, useTranslation } from '../../../intl/intlHelpers';
import { getIconButtonStyles } from './styles';

interface ButtonProps {
  disabled?: boolean;
  icon: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  size?: 'small' | 'medium';
  titleKey: LocaleKey;
}

const StyledButton = styled(Button)(getIconButtonStyles);

const IconButton: React.FC<ButtonProps> = props => {
  const t = useTranslation();
  const { disabled, icon, onClick, size, titleKey } = props;
  return (
    <Tooltip title={t(titleKey)}>
      <StyledButton
        disabled={disabled}
        onClick={onClick}
        size={size}
        variant="contained"
      >
        {icon}
      </StyledButton>
    </Tooltip>
  );
};

export default IconButton;
