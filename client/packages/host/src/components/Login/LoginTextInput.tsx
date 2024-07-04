import React, { useRef } from 'react';
import {
  PasswordTextInput,
  StandardTextFieldProps,
  TextField,
} from '@openmsupply-client/common';

export const LoginTextInput = React.forwardRef<
  HTMLDivElement,
  StandardTextFieldProps
>(({ sx, InputProps, error, ...props }, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const onFocus = () => {
    if (!ref) {
      inputRef?.current?.scrollIntoView();
      return;
    }

    (ref as React.RefObject<HTMLInputElement>).current?.scrollIntoView();
  };

  const componentProps: StandardTextFieldProps = {
    ref: ref || inputRef,
    sx: {
      '& .MuiInput-underline:before': { borderBottomWidth: 0 },
      '& .MuiInput-input': { color: 'gray.dark' },
      '& label': {
        color: theme => `${theme.palette.gray.main}!important`,
        fontSize: '16px',
        paddingLeft: '10px',
      },
      ...sx,
    },
    variant: 'standard',
    focused: true,
    size: 'small',
    InputProps: {
      disableUnderline: true,
      onFocus,
      ...InputProps,
      sx: {
        border: theme =>
          error
            ? `2px solid ${theme.palette.error.main}`
            : `1px solid ${theme.palette.border}`,
        backgroundColor: theme =>
          props.disabled
            ? theme.palette.background.toolbar
            : theme.palette.background.white,
        borderRadius: '8px',
        padding: '4px 8px',
        ...InputProps?.sx,
      },
    },
    ...props,
  };

  return props.type === 'password' ? (
    <PasswordTextInput {...componentProps} fixedHeight />
  ) : (
    <TextField {...componentProps} />
  );
});
