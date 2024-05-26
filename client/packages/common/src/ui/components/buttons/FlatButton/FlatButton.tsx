import React from 'react';
import { Button as MuiButton, styled, SxProps, Theme } from '@mui/material';
import { Property } from 'csstype';
import { useIntlUtils } from '@common/intl';
interface ButtonProps {
  color?: 'inherit' | 'primary' | 'secondary';
  endIcon?: React.ReactNode;
  startIcon?: React.ReactNode;
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  sx?: SxProps<Theme>;
  disabled?: boolean;
  name?: string;
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
  endIcon,
  label,
  onClick,
  startIcon,
  sx,
  name,
  disabled = false,
}) => {
  const { isRtl } = useIntlUtils();
  return (
    <StyledButton
      disabled={disabled}
      onClick={onClick}
      endIcon={endIcon}
      startIcon={startIcon}
      variant="text"
      color={color}
      isRtl={isRtl}
      sx={sx}
      name={name}
    >
      {label}
    </StyledButton>
  );
};
