import React from 'react';
import {
  Box,
  Stack,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import { LoginIcon } from './LoginIcon';

type LoginLayoutProps = {
  UsernameInput: React.ReactNode;
  PasswordInput: React.ReactNode;
  LoginButton: React.ReactNode;
  ErrorMessage: React.ReactNode;
  onLogin: () => Promise<void>;
};

export const LoginLayout = ({
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
          backgroundImage: theme => theme.mixins.gradient.primary,
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
              color: theme => theme.typography.login.color,
              fontSize: {
                xs: '20px',
                sm: '32px',
                md: '38px',
                lg: '48px',
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
                xs: '10px',
                sm: '12px',
                md: '14px',
                lg: '16px',
                xl: '20px',
              },
              color: theme => theme.typography.login.color,
              fontWeight: 600,
            }}
          >
            {t('login.body')}
          </Typography>
        </Box>
      </Box>
      <Box
        flex="1 0 50%"
        sx={{
          backgroundColor: 'background.login',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        display="flex"
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
  );
};
