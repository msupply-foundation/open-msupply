import React from 'react';
import { Button as MuiButton, styled } from '@mui/material';
import { Property } from 'csstype';

interface ButtonProps {
  color?: 'inherit' | 'primary' | 'secondary';
  icon: React.ReactNode;
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
}

const StyledButton = styled(MuiButton)({
  fontWeight: 700,
  marginLeft: 5,
  marginRight: 5,
  textTransform: 'none' as Property.TextTransform,
});

export const FlatButton: React.FC<ButtonProps> = ({
  color,
  label,
  icon,
  onClick,
  disabled = false,
}) => (
  <StyledButton
    disabled={disabled}
    onClick={onClick}
    startIcon={icon}
    variant="text"
    color={color}
  >
    {label}
  </StyledButton>
);
