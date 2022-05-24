import React, { useEffect } from 'react';
import {
  ArrowRightIcon,
  useTranslation,
  LoadingButton,
  Box,
  Typography,
  AlertIcon,
  useHostContext,
  useNavigate,
  ServerStatus,
  useElectronClient,
  frontEndHostDisplay,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useHost } from '../../api/hooks';
import { LoginTextInput } from './LoginTextInput';
import { useLoginForm } from './hooks';
import { LoginLayout } from './LoginLayout';

export const Login = () => {
  const t = useTranslation('app');
  const { connectedServer } = useElectronClient();
  const { setPageTitle } = useHostContext();
  const { data } = useHost.utils.settings();
  const navigate = useNavigate();

  const passwordRef = React.useRef(null);
  const {
    isValid,
    password,
    setPassword,
    username,
    setUsername,
    isLoggingIn,
    onLogin,
    error,
  } = useLoginForm(passwordRef);

  useEffect(() => {
    setPageTitle(`${t('app.login')} | ${t('app')} `);
  }, []);

  useEffect(() => {
    if (data?.status === ServerStatus.Stage_0) {
      navigate(`/${AppRoute.Initialise}`);
    }
  }, [data]);

  return (
    <LoginLayout
      ServerInfo={
        <Typography
          sx={{
            fontSize: '12px',
            color: 'gray.main',
            fontWeight: 600,
          }}
        >
          {connectedServer && `Server: ${frontEndHostDisplay(connectedServer)}`}
        </Typography>
      }
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
