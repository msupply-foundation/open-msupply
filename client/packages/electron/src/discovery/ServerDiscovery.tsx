import React from 'react';
import {
  useElectronClient,
  InlineSpinner,
  BaseButton,
  AlertIcon,
  Box,
  Typography,
  useTranslation,
  frontEndHostDisplay,
} from '@openmsupply-client/common';

import { ServerDiscoveryLayout } from './ServerDiscoveryLayout';

export const ServerDiscovery = () => {
  const { servers, discoveryTimedOut } = useElectronClient(true);
  const t = useTranslation('app');

  return (
    <ServerDiscoveryLayout
      LoadingIndicator={
        servers.length === 0 && <InlineSpinner color="secondary" showText />
      }
      ServerNodes={servers.map(server => {
        const display = frontEndHostDisplay(server);

        return (
          <BaseButton
            key={display}
            onClick={() => {
              window.electronAPI.connectToServer(server);
            }}
          >
            {display}
          </BaseButton>
        );
      })}
      ErrorFindingServer={
        discoveryTimedOut && (
          <Box display="flex" sx={{ color: 'error.main' }} gap={1}>
            <Box>
              <AlertIcon />
            </Box>
            <Box>
              <Typography sx={{ color: 'inherit' }}>
                {t('error.finding-servers')}
              </Typography>
            </Box>
          </Box>
        )
      }
    />
  );
};
