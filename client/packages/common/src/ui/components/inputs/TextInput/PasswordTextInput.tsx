import React, { FC, useState } from 'react';
import { IconButton, StandardTextFieldProps } from '@mui/material';
import { BasicTextInput } from './BasicTextInput';
import { EyeIcon, EyeOffIcon } from '@common/icons';
import { useTranslation } from '@common/intl';

export type PasswordTextInputProps = StandardTextFieldProps;

export const PasswordTextInput: FC<PasswordTextInputProps> = React.forwardRef(
  (props, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [warning, setWarning] = useState(' ');
    const t = useTranslation();
    const visibilityInputButton = (
      <IconButton
        aria-label="toggle password visibility"
        title={t('label.toggle-password-visibility')}
        onClick={() => {
          setShowPassword(!showPassword);
        }}
        style={{ padding: 0 }}
      >
        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
      </IconButton>
    );

    return (
      <BasicTextInput
        {...props}
        type={showPassword ? 'text' : 'password'}
        InputLabelProps={{
          shrink: true,
        }}
        ref={ref}
        helperText={warning}
        InputProps={{
          endAdornment: visibilityInputButton,
          onKeyUp: event =>
            setWarning(
              event.getModifierState('CapsLock') ? t('warning.caps-lock') : ' '
            ),
          ...props.InputProps,
        }}
        FormHelperTextProps={{ error: true }}
      />
    );
  }
);
