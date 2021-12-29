import React from 'react';
import { Button as MuiButton, styled } from '@mui/material';
import { Property } from 'csstype';
import { useRtl } from '@common/intl';
interface ButtonProps {
  color?: 'inherit' | 'primary' | 'secondary';
  icon: React.ReactNode;
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
}

const StyledButton = styled(MuiButton, {
  shouldForwardProp: prop => prop !== 'isRtl',
})<{ isRtl: boolean }>(({ isRtl }) => ({
  fontWeight: 700,
  marginLeft: 5,
  marginRight: 5,
  textTransform: 'none' as Property.TextTransform,
  '& .MuiButton-startIcon': isRtl
    ? {
        marginRight: -4,
        marginLeft: 8,
      }
    : {},
}));

export const FlatButton: React.FC<ButtonProps> = ({
  color,
  label,
  icon,
  onClick,
  disabled = false,
}) => {
  const isRtl = useRtl();
  return (
    <StyledButton
      disabled={disabled}
      onClick={onClick}
      startIcon={icon}
      variant="text"
      color={color}
      isRtl={isRtl}
    >
      {label}
    </StyledButton>
  );
};
