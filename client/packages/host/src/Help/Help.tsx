import {
  AppBarButtonsPortal,
  Box,
  useInitialisationStatus,
} from '@openmsupply-client/common/src';
import React from 'react';
import { AppVersion } from '../components';
import { SiteInfo } from '../components/SiteInfo';

export const Help: React.FC = () => {
  const { data: initStatus } = useInitialisationStatus();
  return (
    <Box flex={1} padding={4} sx={{ maxWidth: 800 }}>
      <div>
        <p>Hello</p>
      </div>

      <AppBarButtonsPortal>
        <AppVersion SiteInfo={<SiteInfo siteName={initStatus?.siteName} />} />
      </AppBarButtonsPortal>
    </Box>
  );
};
