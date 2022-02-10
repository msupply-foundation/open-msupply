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
    case 'secondary':
      return theme.palette.secondary.main;
    default:
      return theme.palette.primary.main;
  }
};

export const StyledBaseButton = styled(MuiButton)(
  ({ theme, color, variant }) => {
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
      height: 40,
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
  }
);

export const BaseButton: React.FC<MuiButtonProps> = ({ ...rest }) => {
  return (
    <StyledBaseButton
      variant="contained"
      color="primary"
      size="small"
      {...rest}
    />
  );
};
