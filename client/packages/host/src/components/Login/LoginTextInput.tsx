import React, { useRef } from 'react';
import { OutlinedTextFieldProps } from '@mui/material';
import {
  PasswordTextInput,
  TextField,
} from '@openmsupply-client/common';

export const LoginTextInput = React.forwardRef<
  HTMLDivElement,
  Omit<OutlinedTextFieldProps, 'variant'>
>(({ sx, slotProps, ...props }, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const onFocus = () => {
    if (!ref) {
      inputRef?.current?.scrollIntoView();
      return;
    }
    (ref as React.RefObject<HTMLInputElement>).current?.scrollIntoView();
  };

  const sharedProps = {
    ref: ref || inputRef,
    sx,
    size: 'small' as const,
    color: 'primary' as const,
    slotProps: {
      input: { onFocus, ...slotProps?.input },
    },
    ...props,
  };

  return props['type'] === 'password' ? (
    <PasswordTextInput {...sharedProps} fixedHeight />
  ) : (
    <TextField {...sharedProps} variant="outlined" />
  );
});
