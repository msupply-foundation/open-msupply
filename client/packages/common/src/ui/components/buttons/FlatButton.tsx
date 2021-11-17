import React from 'react';
import { Button as MuiButton, styled } from '@mui/material';
import { Property } from 'csstype';
import { LocaleKey, useTranslation } from '../../../intl';

interface ButtonProps {
  color?: 'inherit' | 'primary' | 'secondary';
  icon: React.ReactNode;
  labelKey: LocaleKey;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const StyledButton = styled(MuiButton)({
  fontWeight: 700,
  marginLeft: 5,
  marginRight: 5,
  textTransform: 'none' as Property.TextTransform,
});

export const FlatButton: React.FC<ButtonProps> = props => {
  const t = useTranslation();

  const { color, labelKey, icon, onClick } = props;
  return (
    <StyledButton
      onClick={onClick}
      startIcon={icon}
      variant="text"
      color={color}
    >
      {t(labelKey)}
    </StyledButton>
  );
};
