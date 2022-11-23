import React, { FC, useState } from 'react';
import { TabContext } from '@mui/lab';
import { Box } from '@mui/material';
import { LocaleKey, useTranslation } from '@common/intl';
import { ShortTabList, Tab } from './Tabs';
import { ModalTab } from './ModalTab';
import { TabDefinition } from './DetailTabs';

interface DetailTabsProps {
  tabs: TabDefinition[];
}
export const ModalTabs: FC<DetailTabsProps> = ({ tabs }) => {
  const [currentTab, setCurrentTab] = useState<string>(tabs[0]?.value ?? '');
  const t = useTranslation('common');

  return (
    <TabContext value={currentTab}>
      <Box flex={1} display="flex" justifyContent="center">
        <ShortTabList
          value={currentTab}
          centered
          onChange={(_, v) => setCurrentTab(v)}
        >
          {tabs.map(({ value }, index) => (
            <Tab
              key={value}
              value={value}
              label={t(`label.${value.toLowerCase()}` as LocaleKey, value)}
              tabIndex={index === 0 ? -1 : undefined}
            ></Tab>
          ))}
        </ShortTabList>
      </Box>
      {tabs.map(({ Component, value }) => (
        <ModalTab value={value} key={value}>
          {Component}
        </ModalTab>
      ))}
    </TabContext>
  );
};
