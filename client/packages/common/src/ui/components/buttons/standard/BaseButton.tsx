import React from 'react';
import { Property } from 'csstype';
import {
  Button as MuiButton,
  ButtonProps as MuiButtonProps,
} from '@mui/material';
import { styled } from '@mui/material/styles';

export const StyledBaseButton = styled(MuiButton)(
  ({ theme, color, variant }) => {
    let hoverBgColor = variant === 'contained' ? 'white' : 'rgb(163, 64, 33)';
    if (variant === 'contained') {
      hoverBgColor = 'white';
    } else {
      if (color === 'primary') hoverBgColor = 'rgb(163, 64, 33)';
      else hoverBgColor = theme.palette[color ?? 'secondary'].main;
    }

    const hoverColor =
      variant === 'contained'
        ? theme.palette[color ?? 'primary'].main
        : 'white';

    return {
      borderRadius: 24,
      fontWeight: 700,
      height: 40,
      textTransform: 'none' as Property.TextTransform,
      boxShadow: theme.shadows[1],

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
