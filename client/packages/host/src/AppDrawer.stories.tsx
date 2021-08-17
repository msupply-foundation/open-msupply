import React from 'react';
import { Story, ComponentMeta } from '@storybook/react';
import AppDrawer from './AppDrawer';
import { Box, TestingProvider } from '@openmsupply-client/common';
import { SupportedLocales } from '@openmsupply-client/common/src/intl/intlHelpers';

export default {
  title: 'Example/AppDrawer',
  component: AppDrawer,
} as ComponentMeta<typeof AppDrawer>;

interface AppDrawerStoryArgs {
  locale: SupportedLocales;
}

const Template: Story<AppDrawerStoryArgs> = args => (
  <TestingProvider locale={args.locale}>
    <Box display="flex" flex={1} height="100vh">
      <AppDrawer />
    </Box>
  </TestingProvider>
);

export const English = Template.bind({});

export const French = Template.bind({});
French.args = {
  locale: 'fr',
};

export const Portuguese = Template.bind({});
Portuguese.args = {
  locale: 'pt',
};
