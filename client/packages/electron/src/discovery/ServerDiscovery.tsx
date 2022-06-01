import React from 'react';
import {
  Box,
  Typography,
  useTranslation,
  Stack,
} from '@openmsupply-client/common';
import { LoginIcon } from '@openmsupply-client/host/src/components/Login/LoginIcon';
import { Theme } from '@common/styles';
import { DiscoveredServers } from './DiscoveredServers';

export const ServerDiscovery = () => {
  const t = useTranslation('app');
  return (
    <Stack display="flex" style={{ minHeight: '100%' }}>
      <Box display="flex" flex={0} alignSelf="center">
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
      <Box
        display="flex"
        flex={1}
        padding={4}
        style={{ paddingTop: '5%', paddingRight: '10px' }}
      >
        <Typography
          display="flex"
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
            flex: '0 0 50%',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {t('discovery.body')}
        </Typography>
        <Box display="flex" flex="0 0 50%">
          <DiscoveredServers />
        </Box>
      </Box>
    </Stack>
  );
};
