import React, { FC, ReactNode, useEffect, useState } from 'react';
import { TabContext } from '@mui/lab';
import { Box } from '@mui/material';
import { LocaleKey, useTranslation } from '@common/intl';
import { AppBarTabsPortal } from '../../portals';
import { DetailTab } from './DetailTab';
import { ShortTabList, Tab } from './Tabs';
import { useUrlQuery } from '@common/hooks';

export type TabDefinition = {
  Component: ReactNode;
  value: string;
};
interface DetailTabsProps {
  tabs: TabDefinition[];
}
export const DetailTabs: FC<DetailTabsProps> = ({ tabs }) => {
  const { urlQuery, updateQuery } = useUrlQuery();
  const [currentTab, setCurrentTab] = useState<string>(tabs[0]?.value ?? '');
  const t = useTranslation('common');

  const onChange = (_: React.SyntheticEvent, tab: string) => {
    updateQuery({ tab });
  };

  const isValidTab = (tab?: string) =>
    !!tab && tabs.some(({ value }) => value === tab);

  useEffect(() => {
    const tab = urlQuery['tab'];
    if (isValidTab(tab)) setCurrentTab(tab);
  }, [urlQuery]);

  return (
    <TabContext value={currentTab}>
      <AppBarTabsPortal
        sx={{
          display: 'flex',
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <Box flex={1}>
          <ShortTabList value={currentTab} centered onChange={onChange}>
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
      </AppBarTabsPortal>
      {tabs.map(({ Component, value }) => (
        <DetailTab value={value} key={value}>
          {Component}
        </DetailTab>
      ))}
    </TabContext>
  );
};
