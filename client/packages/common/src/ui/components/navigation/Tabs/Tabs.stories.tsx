import React, { useState } from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { TabPanel } from './TabPanel';
import { Tab } from './Tab';
import { Tabs } from './Tabs';

export default {
  title: 'Navigation/Tabs',
  component: Tabs,
} as ComponentMeta<typeof Tabs>;

const ExampleTabs = () => {
  const [currentTab, setCurrentTab] = useState(0);

  return (
    <>
      <Tabs
        value={currentTab}
        centered
        onChange={(_, newTab) => setCurrentTab(newTab)}
      >
        <Tab value={0} label="General" />
        <Tab value={1} label="Item" />
        <Tab value={2} label="Batch" />
        <Tab value={3} label="Log" />
        <Tab value={4} label="Transport" />
      </Tabs>
      <TabPanel
        sx={{ display: 'flex', flex: 1 }}
        tab={0}
        currentTab={currentTab}
      >
        <div
          style={{
            flexGrow: 1,
            display: 'flex',
            backgroundColor: 'hotpink',
          }}
        >
          content1
        </div>
      </TabPanel>
      <TabPanel
        sx={{ display: 'flex', flex: 1 }}
        tab={1}
        currentTab={currentTab}
      >
        <span
          style={{
            flex: 1,
            display: 'flex',
            backgroundColor: 'aqua',
          }}
        >
          content2
        </span>
      </TabPanel>
      <TabPanel
        sx={{ display: 'flex', flex: 1 }}
        tab={2}
        currentTab={currentTab}
      >
        <span
          style={{
            flex: 1,
            display: 'flex',
            backgroundColor: 'turquoise',
          }}
        >
          content3
        </span>
      </TabPanel>
      <TabPanel
        sx={{ display: 'flex', flex: 1 }}
        tab={3}
        currentTab={currentTab}
      >
        <span
          style={{
            flex: 1,
            display: 'flex',
            backgroundColor: 'brown',
          }}
        >
          content4
        </span>
      </TabPanel>
      <TabPanel
        sx={{ display: 'flex', flex: 1 }}
        tab={4}
        currentTab={currentTab}
      >
        <span
          style={{
            flex: 1,
            display: 'flex',
            backgroundColor: 'lime',
          }}
        >
          content5
        </span>
      </TabPanel>
    </>
  );
};

const Template: ComponentStory<typeof Tabs> = () => <ExampleTabs />;

export const Primary = Template.bind({});
