import React from 'react';

import {
  useInitialisationStatus,
  Box,
  AppBarButtonsPortal,
  useIsCentralServerApi,
  UserPermission,
  useAuthContext,
} from '@openmsupply-client/common';
import {
  RadioIcon,
  CustomersIcon,
  SunIcon,
  PrinterIcon,
  ListIcon,
} from '@common/icons';
import { AppVersion } from '../components';
import { SyncSettings } from './SyncSettings';
import { SiteInfo } from '../components/SiteInfo';
import { ServerSettings } from './ServerSettings';
import { ElectronSettings } from './ElectronSettings';
import { DisplaySettings } from './DisplaySettings';
import { SettingsSection } from './SettingsSection';
import { LabelPrinterSettings } from './LabelPrinterSettings';
import { ConfigurationSettings } from './ConfigurationSettings';

export const Settings: React.FC = () => {
  const { data: initStatus } = useInitialisationStatus();
  const [activeSection, setActiveSection] = React.useState<number | null>(null);

  const isCentralServer = useIsCentralServerApi();
  const { userHasPermission } = useAuthContext();

  const toggleSection = (index: number) => () =>
    setActiveSection(activeSection === index ? null : index);

  return (
    <Box flex={1} padding={4} sx={{ maxWidth: 800 }}>
      <SettingsSection
        Icon={SunIcon}
        titleKey="heading.settings-display"
        expanded={activeSection === 0}
        onChange={toggleSection(0)}
        visible={true}
      >
        <DisplaySettings />
      </SettingsSection>
      <SettingsSection
        Icon={RadioIcon}
        titleKey="heading.settings-sync"
        expanded={activeSection === 1}
        onChange={toggleSection(1)}
        visible={userHasPermission(UserPermission.ServerAdmin)}
      >
        <SyncSettings />
      </SettingsSection>
      <SettingsSection
        Icon={CustomersIcon}
        titleKey="heading.support"
        expanded={activeSection === 2}
        onChange={toggleSection(2)}
        visible={userHasPermission(UserPermission.ServerAdmin)}
      >
        <ServerSettings />
      </SettingsSection>
      <SettingsSection
        Icon={PrinterIcon}
        titleKey="heading.devices"
        expanded={activeSection === 3}
        onChange={toggleSection(3)}
        visible={userHasPermission(UserPermission.ServerAdmin)}
      >
        <LabelPrinterSettings />
        <ElectronSettings />
      </SettingsSection>
      {isCentralServer && (
        <SettingsSection
          Icon={ListIcon}
          titleKey="heading.configuration"
          expanded={activeSection === 4}
          onChange={toggleSection(4)}
          visible={userHasPermission(UserPermission.ServerAdmin)}
        >
          <ConfigurationSettings />
        </SettingsSection>
      )}
      <AppBarButtonsPortal>
        <AppVersion SiteInfo={<SiteInfo siteName={initStatus?.siteName} />} />
      </AppBarButtonsPortal>
    </Box>
  );
};
