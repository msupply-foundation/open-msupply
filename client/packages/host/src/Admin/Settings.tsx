import React from 'react';

import {
  useInitialisationStatus,
  Box,
  AppBarButtonsPortal,
} from '@openmsupply-client/common';
import { RadioIcon, CustomersIcon, SunIcon, PrinterIcon } from '@common/icons';
import { AppVersion } from '../components';
import { SyncSettings } from './SyncSettings';
import { SiteInfo } from '../components/SiteInfo';
import { ServerSettings } from './ServerSettings';
import { ElectronSettings } from './ElectronSettings';
import { DisplaySettings } from './DisplaySettings';
import { SettingsSection } from './SettingsSection';
import { LabelPrinterSettings } from './LabelPrinterSettings';

export const Settings: React.FC = () => {
  const { data: initStatus } = useInitialisationStatus();
  const [activeSection, setActiveSection] = React.useState<number | null>(null);

  const toggleSection = (index: number) => () =>
    setActiveSection(activeSection === index ? null : index);

  return (
    <Box flex={1} padding={4} sx={{ maxWidth: 800 }}>
      <SettingsSection
        Icon={SunIcon}
        titleKey="heading.settings-display"
        expanded={activeSection === 0}
        onChange={toggleSection(0)}
      >
        <DisplaySettings />
      </SettingsSection>
      <SettingsSection
        Icon={RadioIcon}
        titleKey="heading.settings-sync"
        expanded={activeSection === 1}
        onChange={toggleSection(1)}
      >
        <SyncSettings />
      </SettingsSection>
      <SettingsSection
        Icon={CustomersIcon}
        titleKey="heading.support"
        expanded={activeSection === 2}
        onChange={toggleSection(2)}
      >
        <ServerSettings />
      </SettingsSection>
      <SettingsSection
        Icon={PrinterIcon}
        titleKey="heading.devices"
        expanded={activeSection === 3}
        onChange={toggleSection(3)}
      >
        <LabelPrinterSettings />
        <ElectronSettings />
      </SettingsSection>
      <AppBarButtonsPortal>
        <AppVersion SiteInfo={<SiteInfo siteName={initStatus?.siteName} />} />
      </AppBarButtonsPortal>
    </Box>
  );
};
