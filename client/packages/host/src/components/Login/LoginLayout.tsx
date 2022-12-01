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

type LoginLayoutProps = {
  ServerInfo: React.ReactNode;
  UsernameInput: React.ReactNode;
  PasswordInput: React.ReactNode;
  LoginButton: React.ReactNode;
  ErrorMessage: React.ReactNode;
  onLogin: () => Promise<void>;
};

export const LoginLayout = ({
  ServerInfo,
  UsernameInput,
  PasswordInput,
  LoginButton,
  ErrorMessage,
  onLogin,
}: LoginLayoutProps) => {
  const t = useTranslation('app');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      onLogin();
    }
  };

  return (
    <Box display="flex" style={{ width: '100%' }}>
      <Box
        flex="1 0 50%"
        sx={{
          backgroundImage: (theme: Theme) => theme.mixins.gradient.primary,
          padding: '0 80px 7% 80px',
        }}
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
                xs: '38px',
                sm: '38px',
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
          <Box style={{ width: 285 }}>
            <form onSubmit={onLogin} onKeyDown={handleKeyDown}>
              <Stack spacing={5}>
                <Box display="flex" justifyContent="center">
                  <LoginIcon />
                </Box>
                {UsernameInput}
                {PasswordInput}
                {ErrorMessage}
                <Box display="flex" justifyContent="flex-end">
                  {LoginButton}
                </Box>
              </Stack>
            </form>
          </Box>
        </Box>
      </Box>
      <Typography
        component="div"
        sx={{
          fontSize: {
            xs: '12px',
            sm: '12px',
            md: '12px',
            lg: '14px',
            xl: '14px',
          },
          color: 'gray.main',
          position: 'absolute',
          bottom: '10px',
          right: '30px',
        }}
      >
        {ServerInfo}
      </Typography>
      <AppVersion style={{ opacity: 0.4 }} />
    </Box>
  );
};
