import React, { ReactNode } from 'react';
import {
  Box,
  Stack,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import { LoginIcon } from '../Login/LoginIcon';
import { Theme } from '@common/styles';

type LoginLayoutProps = {
  UsernameInput: ReactNode;
  PasswordInput: ReactNode;
  SiteIdInput: ReactNode;
  UrlInput: ReactNode;
  SaveButton: ReactNode;
  ErrorMessage: ReactNode;
  onSave: () => Promise<void>;
};

export const InitialiseLayout = ({
  UsernameInput,
  PasswordInput,
  SiteIdInput,
  UrlInput,
  SaveButton,
  ErrorMessage,
  onSave,
}: LoginLayoutProps) => {
  const t = useTranslation('app');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      onSave();
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
            {t('initialise.heading')}
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
              whiteSpace: 'pre-line',
            }}
          >
            {t('initialise.body')}
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
          <form onSubmit={onSave} onKeyDown={handleKeyDown}>
            <Stack spacing={5}>
              <Box display="flex" justifyContent="center">
                <LoginIcon />
              </Box>
              {UrlInput}
              {SiteIdInput}
              {UsernameInput}
              {PasswordInput}
              {ErrorMessage}
              <Box display="flex" justifyContent="flex-end">
                {SaveButton}
              </Box>
            </Stack>
          </form>
        </Box>
      </Box>
    </Box>
  );
};
