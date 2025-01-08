import React from 'react';
import { Property } from 'csstype';
import {
  Button as MuiButton,
  ButtonProps as MuiButtonProps,
  styled,
  Theme,
} from '@mui/material';

export const translateColor = (theme: Theme, color?: string) => {
  switch (color) {
    case 'error':
      return theme.palette.error.main;
    case 'secondary':
      return theme.palette.secondary.main;
    default:
      return theme.palette.primary.main;
  }
};

export const StyledBaseButton = styled(MuiButton)(({
  theme,
  color,
  variant,
  style,
}) => {
  const getHoverBgColor = () =>
    variant === 'contained'
      ? theme.palette.background.white
      : translateColor(theme, color);

  const getHoverColor = () =>
    variant === 'contained'
      ? translateColor(theme, color)
      : theme.palette.background.white;

  const getIconColor = () =>
    variant === 'outlined'
      ? theme.palette.primary.contrastText
      : translateColor(theme, color);

  const hoverBgColor = getHoverBgColor();
  const hoverColor = getHoverColor();
  const iconColor = getIconColor();

  return {
    '&.MuiButton-contained': { fontWeight: 600 },
    '&.MuiButton-outlined': {
      backgroundColor: 'white',
      color:
        color === 'primary'
          ? theme.mixins.button?.textColor
          : translateColor(theme, color),
      '& .MuiButton-startIcon': {
        color: color === 'primary' ? translateColor(theme, color) : undefined,
      },
    },
    border: 'none',
    borderRadius: 24,
    boxShadow: theme.shadows[2],
    fontSize: '0.875rem',
    height: style?.height ?? 40,
    minWidth: '115px',
    textTransform: 'none' as Property.TextTransform,
    '&:hover': {
      border: 'none',
      color: hoverColor,
      backgroundColor: hoverBgColor,
      '& .MuiButton-startIcon': {
        color: color === 'primary' ? iconColor : undefined,
      },
    },
  };
});

export const BaseButton: React.FC<MuiButtonProps> = ({ onClick, ...rest }) => {
  return (
    <StyledBaseButton
      variant="contained"
      color="primary"
      size="small"
      onClick={onClick}
      onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.code === 'Enter' && !!onClick) onClick({} as any);
      }}
      {...rest}
    />
  );
};
