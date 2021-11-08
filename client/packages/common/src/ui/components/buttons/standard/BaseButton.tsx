import React from 'react';
import { Property } from 'csstype';
import {
  Button as MuiButton,
  ButtonProps as MuiButtonProps,
  styled,
} from '@mui/material';

export const StyledBaseButton = styled(MuiButton)(
  ({ theme, color, variant }) => {
    const getHoverBgColor = () => {
      if (variant === 'contained') {
        return 'white';
      }

      if (color === 'primary') {
        return 'rgb(163, 64, 33)';
      }

      if (color === 'secondary') {
        return theme.palette.secondary.main;
      }
    };

    const getHoverColor = () => {
      if (variant === 'contained') {
        return theme.palette.secondary.main;
      }
      return 'white';
    };

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
