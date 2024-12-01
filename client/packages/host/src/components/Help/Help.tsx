import {
  AppBarButtonsPortal,
  Box,
  useInitialisationStatus,
} from '@openmsupply-client/common/src';
import React from 'react';
import { AppVersion } from '..';
import { SiteInfo } from '../SiteInfo';
import { FeedbackForm } from './FeedbackForm';

export const Help: React.FC = () => {
  const { data: initStatus } = useInitialisationStatus();
  return (
    <Box flex={1} padding={4} sx={{ maxWidth: 800 }}>
      <FeedbackForm />
      <AppBarButtonsPortal>
        <AppVersion SiteInfo={<SiteInfo siteName={initStatus?.siteName} />} />
      </AppBarButtonsPortal>
    </Box>
  );
};
