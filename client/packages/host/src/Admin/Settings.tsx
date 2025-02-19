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
import { SyncSettings } from './SyncSettings';
import { ServerSettings } from './ServerSettings';
import { ElectronSettings } from './ElectronSettings';
import { DisplaySettings } from './DisplaySettings';
import { SettingsSection } from './SettingsSection';
import { LabelPrinterSettings } from './LabelPrinterSettings';
import { Printers } from './Printers';
import { ConfigurationSettings } from './ConfigurationSettings';
import { ServerInfo } from './ServerInfo';

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
      <SettingsSection
        Icon={PrinterIcon}
        titleKey="heading.printers"
        expanded={activeSection === 4}
        onChange={toggleSection(4)}
        visible={true}
      >
        <Printers />
      </SettingsSection>
      {isCentralServer && (
        <SettingsSection
          Icon={ListIcon}
          titleKey="heading.configuration"
          expanded={activeSection === 5}
          onChange={toggleSection(5)}
          visible={userHasPermission(UserPermission.ServerAdmin)}
        >
          <ConfigurationSettings />
        </SettingsSection>
      )}
      <AppBarButtonsPortal>
        <Box
          flex={1}
          display="flex"
          justifyContent="flex-end"
          flexDirection="column"
        >
          <ServerInfo siteName={initStatus?.siteName} />
        </Box>
      </AppBarButtonsPortal>
    </Box>
  );
};
