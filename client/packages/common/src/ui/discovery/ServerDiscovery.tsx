import React from 'react';
import {
  Box,
  Typography,
  useTranslation,
  Stack,
  useNativeClient,
} from '@openmsupply-client/common';
import { LoginIcon } from '@openmsupply-client/host/src/components/Login/LoginIcon';
import { Theme } from '@common/styles';
import { DiscoveredServers } from './DiscoveredServers';

// TODO should this be disabled if native client doesn't exist ? (since it's navigatable from host)

// When discovery is opened with ?autoconnect=true URL parameter, useNativeClient will try to connect to previously
// connected server, this is useful when navigating back to discovery from login or initialisation screen
// to prevent autoconnecting if discovery is desired
const isAutoconnect = () => {
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);
  return params.get('autoconnect') === 'true';
};

export const ServerDiscovery = () => {
  const { servers, discoveryTimedOut, connectToServer, discover } =
    useNativeClient({
      discovery: true,
      autoconnect: isAutoconnect(),
    });
  const t = useTranslation('app');

  return (
    <Stack display="flex" style={{ minHeight: '100%' }}>
      <Box display="flex" flex="0 0 50%" alignSelf="center">
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
      <Box display="flex" flexDirection="column" flex={1} padding={4}>
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
            paddingBottom: '2%',
          }}
        >
          {t('discovery.body')}
        </Typography>
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
