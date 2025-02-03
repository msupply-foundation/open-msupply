import React, { ReactNode } from 'react';
import {
  Box,
  Stack,
  Typography,
  useTranslation,
  useIsScreen,
} from '@openmsupply-client/common';
import { LoginIcon } from '../Login/LoginIcon';
import { Theme } from '@common/styles';
import { AppVersion } from '../AppVersion';

type LoginLayoutProps = {
  UsernameInput: ReactNode;
  PasswordInput: ReactNode;
  UrlInput: ReactNode;
  Button: ReactNode;
  SyncProgress: ReactNode;
  ErrorMessage: ReactNode;
  SiteInfo: React.ReactNode;
  onInitialise: () => Promise<void>;
};

export const InitialiseLayout = ({
  UsernameInput,
  PasswordInput,
  UrlInput,
  Button,
  ErrorMessage,
  SyncProgress,
  SiteInfo,
  onInitialise,
}: LoginLayoutProps) => {
  const t = useTranslation();
  const isMobile = useIsScreen('sm');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      onInitialise();
    }
  };

  return (
    <Box display="flex" sx={theme => ({
      [theme.breakpoints.down('sm')]: {
        flexDirection: 'column',
      },
      width: '100%'
    })}
    >
      <Box
        flex="1 0 50%"
        sx={theme => ({
          [theme.breakpoints.down('sm')]: {            
            flex: '0 0 0',
            padding: '2em',
          },
          backgroundImage: (theme: Theme) => theme.mixins.gradient.secondary,
          padding: '0 80px 7% 80px',
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
                xs: '20px',
                sm: '20px',
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
                xs: '14px',
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
        sx={theme => ({
          [theme.breakpoints.down('sm')]: {
            overflowY: 'unset',
          },
          backgroundColor: 'background.login',
          overflowY: 'scroll',
        })}
        display="flex"
        flexDirection="column"
      >
        <Box
          sx={theme => ({
            [theme.breakpoints.down('sm')]: {
              justifyContent: 'flex-start',
              paddingTop: '1.5em'
            },
            alignItems: 'center',
            justifyContent: 'center',
          })}
          display="flex"
          flexDirection="column"
          flex={1}
        >
          <Box style={{ width: 285 }}>
            <form onSubmit={onInitialise} onKeyDown={handleKeyDown}>
              <Stack spacing={isMobile ? 3 : 5}>                
                <Box display="flex" justifyContent="center">
                  <LoginIcon small />
                </Box>
                {UrlInput}
                {UsernameInput}
                {PasswordInput}
                {ErrorMessage}
                <Box display="flex" justifyContent="flex-end">
                  {Button}
                </Box>
              </Stack>
            </form>
          </Box>
          <Box paddingTop={2} width="100%">
            {SyncProgress}
          </Box>
        </Box>
        <AppVersion style={{ opacity: 0.4 }} SiteInfo={SiteInfo} />
      </Box>
    </Box>
  );
};
