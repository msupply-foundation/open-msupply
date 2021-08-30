import React from 'react';
import { Button as MuiButton } from '@material-ui/core';
import { styled } from '@material-ui/styles';
import { LocaleKey, useTranslation } from '../../../intl/intlHelpers';
import { getTextButtonStyles } from './styles';

interface ButtonProps {
  disabled?: boolean;
  labelKey: LocaleKey;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const StyledButton = styled(MuiButton)(getTextButtonStyles);

const TextButton: React.FC<ButtonProps> = props => {
  const t = useTranslation();
  const { disabled, labelKey, onClick } = props;
  return (
    <StyledButton disabled={disabled} onClick={onClick} variant="contained">
      {t(labelKey)}
    </StyledButton>
  );
};

export default TextButton;
