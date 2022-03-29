import React, { useEffect } from 'react';
import {
  ArrowRightIcon,
  useTranslation,
  AutocompleteRenderInputParams,
  LoadingButton,
  Box,
  Typography,
  AlertIcon,
  useHostContext,
} from '@openmsupply-client/common';
import { LoginTextInput } from './LoginTextInput';
import { StoreSearchInput } from '@openmsupply-client/system';
import { useLoginForm } from './hooks';
import { LoginLayout } from './LoginLayout';

const StoreAutocompleteInput: React.FC<
  AutocompleteRenderInputParams
> = props => {
  const t = useTranslation('app');
  return (
    <LoginTextInput
      {...props}
      InputProps={{ ...props.InputProps }}
      style={{ width: 282 }}
      label={t('heading.store')}
    />
  );
};

export const Login: React.FC = ({}) => {
  const t = useTranslation('app');
  const { setPageTitle } = useHostContext();
  useEffect(() => {
    setPageTitle(`${t('app.login')} | ${t('app')} `);
  }, []);

  const passwordRef = React.useRef(null);
  const {
    isValid,
    password,
    setPassword,
    store,
    setStore,
    username,
    setUsername,
    isLoggingIn,
    onLogin,
    error,
  } = useLoginForm(passwordRef);

  return (
    <LoginLayout
      UsernameInput={
        <LoginTextInput
          fullWidth
          label={t('heading.username')}
          value={username}
          disabled={isLoggingIn}
          onChange={e => setUsername(e.target.value)}
          inputProps={{
            autoComplete: 'username',
          }}
          autoFocus
        />
      }
      PasswordInput={
        <LoginTextInput
          fullWidth
          label={t('heading.password')}
          type="password"
          value={password}
          disabled={isLoggingIn}
          onChange={e => setPassword(e.target.value)}
          inputProps={{
            autoComplete: 'current-password',
          }}
          inputRef={passwordRef}
        />
      }
      StoreInput={
        <StoreSearchInput
          onChange={setStore}
          renderInput={StoreAutocompleteInput}
          isDisabled={isLoggingIn}
          value={store}
        />
      }
      LoginButton={
        <LoadingButton
          isLoading={isLoggingIn}
          onClick={onLogin}
          variant="outlined"
          endIcon={<ArrowRightIcon />}
          disabled={!isValid}
        >
          {t('button.login')}
        </LoadingButton>
      }
      ErrorMessage={
        error && (
          <Box display="flex" sx={{ color: 'error.main' }} gap={1}>
            <Box>
              <AlertIcon />
            </Box>
            <Box>
              <Typography sx={{ color: 'inherit' }}>
                {error.message || t('error.login')}
              </Typography>
            </Box>
          </Box>
        )
      }
      onLogin={async () => {
        if (isValid) await onLogin();
      }}
    />
  );
};
