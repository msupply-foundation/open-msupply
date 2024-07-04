import React, { useState } from 'react';
import { IconButton, StandardTextFieldProps } from '@mui/material';
import { BasicTextInput } from './BasicTextInput';
import { EyeIcon, EyeOffIcon } from '@common/icons';
import { useTranslation } from '@common/intl';

export type PasswordTextInputProps = StandardTextFieldProps & {
  fixedHeight?: boolean;
};

export const PasswordTextInput = React.forwardRef<
  HTMLDivElement,
  PasswordTextInputProps
>((props, ref) => {
  // if the helper text is a space then the height of the component doesn't change
  // when the helper text is shown / removed
  const { fixedHeight, ...rest } = props;
  const defaultWarning = fixedHeight ? ' ' : '';
  const [showPassword, setShowPassword] = useState(false);
  const [warning, setWarning] = useState(defaultWarning);
  const t = useTranslation();
  const visibilityInputButton = (
    <IconButton
      aria-label="toggle password visibility"
      disabled={props.disabled}
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
      {...rest}
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
            event.getModifierState('CapsLock')
              ? t('warning.caps-lock')
              : defaultWarning
          ),
        ...props.InputProps,
      }}
      FormHelperTextProps={{ error: true }}
    />
  );
});
