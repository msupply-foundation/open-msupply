import React from 'react';
import { Property } from 'csstype';
import {
  Button as MuiButton,
  ButtonProps as MuiButtonProps,
  styled,
  Theme,
} from '@mui/material';

const translateColor = (theme: Theme, color?: string) => {
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

  const hoverBgColor = getHoverBgColor();
  const hoverColor = getHoverColor();

  return {
    '&.MuiButton-outlined': {
      backgroundColor: 'white',
    },

    borderRadius: 24,
    fontWeight: 700,
    height: style?.height ?? 40,
    textTransform: 'none' as Property.TextTransform,
    boxShadow: theme.shadows[2],

    minWidth: '115px',

    border: 'none',

    '&:hover': {
      border: 'none',
      color: hoverColor,
      backgroundColor: hoverBgColor,
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
