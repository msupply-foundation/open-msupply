import React from 'react';
import {
  Box,
  Stack,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import { LoginIcon } from './LoginIcon';
import { Theme } from '@common/styles';
import { AppVersion } from '../AppVersion';
import { LanguageButton } from '../LanguageButton';

export type LoginLayoutProps = {
  UsernameInput: React.ReactNode;
  PasswordInput: React.ReactNode;
  LoginButton: React.ReactNode;
  ErrorMessage: React.ReactNode;
  SiteInfo: React.ReactNode;
  onLogin: () => Promise<void>;
  fullSize: boolean;
};

export const LoginLayout = ({
  UsernameInput,
  PasswordInput,
  LoginButton,
  ErrorMessage,
  SiteInfo,
  onLogin,
  fullSize,
}: LoginLayoutProps) => {
  const t = useTranslation();

  const loginForm = (
    <LoginForm
      UsernameInput={UsernameInput}
      PasswordInput={PasswordInput}
      LoginButton={LoginButton}
      ErrorMessage={ErrorMessage}
      SiteInfo={SiteInfo}
      onLogin={onLogin}
      fullSize={fullSize}
    />
  );

  return !fullSize ? (
    loginForm
  ) : (
    <Box display="flex" style={{ width: '100%' }}>
      <Box
        flex="1 0 50%"
        sx={theme => ({
          [theme.breakpoints.down('sm')]: {
            display: 'none',
          },
          backgroundImage: (theme: Theme) => theme.mixins.gradient.primary,
          backgroundSize: (theme: Theme) => theme.mixins.gradient.size,
          backgroundPosition: (theme: Theme) => theme.mixins.gradient.position,
          padding: '0 5% 7%',
        })}
        display="flex"
        alignItems="flex-start"
        justifyContent="flex-end"
        flexDirection="column"
      >
        <Box>
          <Typography
            sx={{
              color: (theme: Theme) => theme.typography.login.color,
              fontSize: {
                xs: '28px',
                sm: '30px',
                md: '48px',
                lg: '64px',
                xl: '64px',
              },
              fontWeight: 'bold',
              lineHeight: 'normal',
              whiteSpace: 'pre-line',
            }}
          >
            {t('login.heading')}
          </Typography>
        </Box>
        <Box style={{ marginTop: 45 }}>
          <Typography
            sx={{
              fontSize: {
                xs: '12px',
                sm: '14px',
                md: '16px',
                lg: '20px',
                xl: '20px',
              },
              color: (theme: Theme) => theme.typography.login.color,
              fontWeight: 600,
            }}
          >
            {t('login.body')}
          </Typography>
        </Box>
      </Box>
      <Box
        flex="1 0 50%"
        flexDirection="column"
        alignItems="center"
        display="flex"
        sx={{
          backgroundColor: 'background.login',
          overflowY: 'scroll',
        }}
      >
        <Box
          display="flex"
          flexGrow="1"
          sx={{
            alignItems: 'center',
          }}
        >
          {loginForm}
        </Box>
        {/* Suspense boundary lets SSR renderToString work even when
            AppVersion suspends (useIsCentralServerApi has suspense:true). */}
        <React.Suspense fallback={null}>
          <AppVersion style={{ opacity: 0.4 }} SiteInfo={SiteInfo} />
          <LanguageButton />
        </React.Suspense>
      </Box>
    </Box>
  );
};

const LoginForm = ({
  UsernameInput,
  PasswordInput,
  LoginButton,
  ErrorMessage,
  onLogin,
  fullSize,
}: LoginLayoutProps) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      onLogin();
    }
  };

  return (
    <form onSubmit={onLogin} onKeyDown={handleKeyDown}>
      <Stack spacing={fullSize ? 5 : 2}>
        {fullSize && (
          <Box display="flex" justifyContent="center">
            <LoginIcon />
          </Box>
        )}
        {UsernameInput}
        {PasswordInput}
        {ErrorMessage}
        <Box display="flex" justifyContent="flex-end">
          {LoginButton}
        </Box>
      </Stack>
    </form>
  );
};
