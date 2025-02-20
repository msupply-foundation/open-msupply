import React from 'react';
import {
  AppBarButtonsPortal,
  Box,
  ButtonWithIcon,
  Typography,
  useInitialisationStatus,
  useKBar,
} from '@openmsupply-client/common';
import { EyeIcon, EyeOffIcon } from '@common/icons';
import { useTranslation } from '@common/intl';
import { AppVersion } from '../components';
import { SiteInfo } from '../components/SiteInfo';
import { ContactFormSection } from './ContactFormSection';
import { UserGuide } from './UserGuide';

export const Help = () => {
  const { data: initStatus } = useInitialisationStatus();
  const t = useTranslation();
  const { query, kBarHidden } = useKBar(state => ({
    kBarHidden: state.visualState === 'hidden',
  }));

  return (
    <Box flex={1} padding={4} sx={{ maxWidth: 800 }}>
      <UserGuide />
      <Typography variant="h5" paddingTop={4} paddingBottom={1}>
        {t('heading.keyboard-shortcuts')}
      </Typography>
      <Typography style={{ paddingBottom: 10 }}>
        {t('message.keyboard-shortcuts')}
      </Typography>
      <Box display="flex" justifyContent="flex-end">
        <ButtonWithIcon
          onClick={() => query.toggle()}
          label={t(
            kBarHidden ? 'button.shortcuts-show' : 'button.shortcuts-hide'
          )}
          Icon={kBarHidden ? <EyeIcon /> : <EyeOffIcon />}
        />
      </Box>

      <ContactFormSection />
      <AppBarButtonsPortal>
        <AppVersion SiteInfo={<SiteInfo siteName={initStatus?.siteName} />} />
      </AppBarButtonsPortal>
    </Box>
  );
};
