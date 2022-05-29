import React, { ReactNode } from 'react';
import {
  Box,
  Stack,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';

import { LoginIcon } from '@openmsupply-client/host/src/components/Login/LoginIcon';
import { Theme } from '@common/styles';

type ServerDiscoveryProps = {
  LoadingIndicator: ReactNode;
  ServerNodes: ReactNode[];
  ErrorFindingServer: ReactNode;
};

export const ServerDiscoveryLayout = ({
  LoadingIndicator,
  ServerNodes,
  ErrorFindingServer,
}: ServerDiscoveryProps) => {
  const t = useTranslation('app');
  return (
    <Box display="flex" style={{ minHeight: '100%' }}>
      <Box display="flex" style={{ width: '100%' }}>
        <Box
          flex="1 0 50%"
          sx={{
            backgroundImage: (theme: Theme) => theme.mixins.gradient.tertiary,
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
          sx={{
            backgroundColor: 'background.login',
            alignItems: 'center',
            justifyContent: 'center',
            overflowY: 'scroll',
          }}
          display="flex"
        >
          <Box style={{ width: 285 }}>
            <Stack spacing={5} alignItems="center">
              <LoginIcon />
              <Stack spacing={3}>
                {LoadingIndicator}
                {ServerNodes}
                <Box display="flex" justifyContent="flex-end">
                  {ErrorFindingServer}
                </Box>
              </Stack>
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
