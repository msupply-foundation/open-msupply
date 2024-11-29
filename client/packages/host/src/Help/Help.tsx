import {
  AppBarButtonsPortal,
  BookIcon,
  Box,
  useInitialisationStatus,
} from '@openmsupply-client/common/src';
import React from 'react';
import { AppVersion } from '../components';
import { SiteInfo } from '../components/SiteInfo';
import { UserGuide } from '../Admin/UserGuide';
import { HelpSection } from './HelpSection';

export const Help: React.FC = () => {
  const { data: initStatus } = useInitialisationStatus();

  const [activeSection, setActiveSection] = React.useState<number | null>(null);

  const toggleSection = (index: number) => () =>
    setActiveSection(activeSection === index ? null : index);

  return (
    <Box flex={1} padding={4} sx={{ maxWidth: 800 }}>
      <div>
        <p>Hello</p>
      </div>
      <HelpSection
        Icon={BookIcon}
        titleKey="heading.user-guide"
        expanded={activeSection === 5}
        onChange={toggleSection(5)}
      >
        <UserGuide />
      </HelpSection>
      <AppBarButtonsPortal>
        <AppVersion SiteInfo={<SiteInfo siteName={initStatus?.siteName} />} />
      </AppBarButtonsPortal>
    </Box>
  );
};
