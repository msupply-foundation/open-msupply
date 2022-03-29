import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Grid,
  useTranslation,
  Tab,
  TabList,
} from '@openmsupply-client/common';
import { Statistics } from './Statistics';

interface ToolbarProps {
  currentTab: string;
  onChangeTab: (newTab: string) => void;
}

export const Toolbar: FC<ToolbarProps> = ({ currentTab, onChangeTab }) => {
  const t = useTranslation('catalogue');

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid container flexDirection="column">
        <Grid item display="flex" flex={1} gap={1}>
          <Statistics />
        </Grid>
        <Grid item display="flex" flex={1} flexDirection="column" gap={1}>
          <TabList
            value={currentTab}
            centered
            onChange={(_, v) => onChangeTab(v)}
          >
            <Tab value="general" label={t('tab.general')} />
            <Tab value="master-lists" label={t('tab.master-lists')} />
          </TabList>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
