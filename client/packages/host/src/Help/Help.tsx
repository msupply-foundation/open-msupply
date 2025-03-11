import React from 'react';
import {
  AppBarButtonsPortal,
  Box,
  Typography,
  useInitialisationStatus,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { AppVersion } from '../components';
import { SiteInfo } from '../components/SiteInfo';
import { ContactFormSection } from './ContactFormSection';
import { UserGuide } from './UserGuide';

export const Help = () => {
  const { data: initStatus } = useInitialisationStatus();
  const t = useTranslation();

  return (
    <Box flex={1} padding={4} sx={{ maxWidth: 800 }}>
      <UserGuide />
      <Typography variant="h5" paddingTop={4} paddingBottom={1}>
        {t('heading.keyboard-shortcuts')}
      </Typography>
      <Typography style={{ paddingBottom: 10 }}>
        {t('message.keyboard-shortcuts')}
      </Typography>

      <ContactFormSection />
      <AppBarButtonsPortal>
        <AppVersion SiteInfo={<SiteInfo siteName={initStatus?.siteName} />} />
      </AppBarButtonsPortal>
    </Box>
  );
};
