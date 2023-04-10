import React from 'react';
import {
  Box,
  Typography,
  useTranslation,
  Stack,
  useNativeClient,
  ErrorWithDetails,
  frontEndHostDisplay,
} from '@openmsupply-client/common';
import { LoginIcon } from '@openmsupply-client/host/src/components/Login/LoginIcon';
import { Theme } from '@common/styles';
import { DiscoveredServers } from './DiscoveredServers';

// TODO should this be disabled if native client doesn't exist ? (since it's navigatable from host)

// When discovery is opened, by default, useNativeClient will try to connect to previously connected server
// if ?autoconnect=false url parameter is present, auto connection will be disabled, this is useful when navigating
// back to discovery from login or initialisation screen to prevent autoconnecting if discovery is desired
const isAutoconnect = () => {
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);
  // autoconnect deafults to true
  return params.get('autoconnect') !== 'false';
};

const isTimedOut = () => {
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);
  return params.get('timedout') === 'true';
};

export const ServerDiscovery = () => {
  const {
    servers,
    discoveryTimedOut,
    connectToServer,
    startDiscovery,
    stopDiscovery,
    connectToPreviousTimedOut,
    previousServer,
  } = useNativeClient({
    discovery: true,
    autoconnect: isAutoconnect(),
  });
  const t = useTranslation('app');
  const discover = () => {
    stopDiscovery();
    startDiscovery();
  };

  const server = previousServer ? frontEndHostDisplay(previousServer) : '';

  return (
    <Stack
      display="flex"
      style={{ minHeight: '100%' }}
      alignItems="center"
      flex={1}
    >
      <Box
        display="flex"
        flex="0 0 40%"
        alignSelf="center"
        style={{ marginLeft: '-10%' }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          padding={2}
        >
          <LoginIcon />
        </Box>
        <Box display="flex" flexDirection="column" justifyContent="center">
          <Typography
            component="div"
            sx={{
              color: (theme: Theme) => theme.palette.gray.main,
              fontSize: {
                xs: '38px',
                sm: '38px',
                md: '48px',
                lg: '64px',
                xl: '64px',
              },
              fontWeight: 'bold',
              display: 'flex',
              justifyContent: 'center',
              flexDirection: 'column',
            }}
          >
            {t('discovery.heading')}
          </Typography>
          <Typography
            component="div"
            sx={{
              color: (theme: Theme) => theme.palette.gray.main,
              fontSize: {
                xs: '19px',
                sm: '19px',
                md: '24px',
                lg: '32px',
                xl: '32px',
              },
              fontWeight: 'bold',
              display: 'flex',
              justifyContent: 'center',
              flexDirection: 'column',
            }}
          >
            {t('discovery.sub-heading')}
          </Typography>
        </Box>
      </Box>
      <Box display="flex" flexDirection="column" flex={1} padding={1}>
        <Typography
          component="div"
          display="flex"
          flex={0}
          justifyContent="center"
          sx={{
            fontSize: {
              xs: '12px',
              sm: '14px',
              md: '16px',
              lg: '20px',
              xl: '20px',
            },
            color: 'gray.main',
            fontWeight: 600,
            whiteSpace: 'pre-line',
            paddingBottom: '5%',
          }}
        >
          {t('discovery.body')}
        </Typography>
        {(connectToPreviousTimedOut || isTimedOut()) && (
          <Box padding={2}>
            <ErrorWithDetails
              error={t('error.unable-to-connect', { server })}
              details=""
            />
          </Box>
        )}
        <Box display="flex" flex={1} justifyContent="center">
          <DiscoveredServers
            servers={servers}
            connect={connectToServer}
            discoveryTimedOut={discoveryTimedOut}
            discover={discover}
          />
        </Box>
      </Box>
    </Stack>
  );
};
