import React from 'react';
import {
  Button as MuiButton,
  ButtonProps as MuiButtonProps,
  styled,
} from '@mui/material';

export const StyledTextInputButton = styled(MuiButton)(({
  theme,
  disabled,
}) => {
  return {
    color: theme.palette.gray.dark,

    backgroundColor: disabled
      ? theme.palette.background.toolbar
      : theme.palette.background.menu,
    height: '36px',
    justifyContent: 'space-between',
    '& .MuiButton-endIcon': {
      marginRight: '2px',
    },
    fontWeight: 'unset',
    fontSize: 'unset',
    width: '100%',
    textTransform: 'none',
  };
});

export const TextInputButton = ({ onClick, ...rest }: MuiButtonProps) => {
  return (
    <StyledTextInputButton
      size="small"
      onClick={onClick}
      onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.code === 'Enter' && !!onClick) onClick({} as any);
      }}
      {...rest}
    />
  );
};
