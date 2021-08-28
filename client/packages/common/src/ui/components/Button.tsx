import React from 'react';
import { Button as MuiButton, ButtonProps, Theme } from '@material-ui/core';
import { styled } from '@material-ui/styles';

const StyledButton = styled(MuiButton)(({ theme }: { theme: Theme }) => ({
  backgroundColor: '#fff',
  borderRadius: 24,
  color: theme.palette.primary.main,
  fontWeight: 'bold',
  height: 40,
  marginRight: 10,
  minWidth: 115,
  textTransform: 'none',
  boxShadow: theme.shadows[1],
}));

const Button: React.FC<ButtonProps> = props => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { variant, ...otherProps } = props;
  return <StyledButton variant="contained" {...otherProps} />;
};

export default Button;
