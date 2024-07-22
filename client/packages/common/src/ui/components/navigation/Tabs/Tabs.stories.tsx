import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { TabList, Tab, TabPanel, TabContext } from './Tabs';
import { useTabs } from './useTabs';
import { Box } from '@mui/material';

export default {
  title: 'Navigation/Tabs',
  component: TabList,
} as Meta<typeof TabList>;

const ExampleTabs = () => {
  const { currentTab, onChangeTab } = useTabs('hotpink');

  return (
    <TabContext value={currentTab}>
      <TabList value={currentTab} centered onChange={(_, v) => onChangeTab(v)}>
        <Tab value="hotpink" label="Hot Pink" />
        <Tab value="aqua" label="Aqua" />
        <Tab value="turquoise" label="Turquoise" />
        <Tab value="brown" label="Brown" />
        <Tab value="lime" label="Lime" />
      </TabList>

      <Box sx={{ display: 'flex', flex: 1 }}>
        <TabPanel sx={{ flex: 1 }} value={'hotpink'}>
          <Box height="100%" bgcolor="hotpink" />
        </TabPanel>
        <TabPanel sx={{ flex: 1 }} value={'aqua'}>
          <Box height="100%" bgcolor="aqua" />
        </TabPanel>
        <TabPanel sx={{ flex: 1 }} value={'turquoise'}>
          <Box height="100%" bgcolor="turquoise" />
        </TabPanel>
        <TabPanel sx={{ flex: 1 }} value={'brown'}>
          <Box height="100%" bgcolor="brown" />
        </TabPanel>
        <TabPanel sx={{ flex: 1 }} value={'lime'}>
          <Box height="100%" bgcolor="lime" />
        </TabPanel>
      </Box>
    </TabContext>
  );
};

const Template: StoryFn<typeof TabList> = () => <ExampleTabs />;

export const Primary = Template.bind({});
