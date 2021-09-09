import React from 'react';
import { Story, ComponentMeta } from '@storybook/react';
import AppDrawer from './AppDrawer';
import { TestingProvider } from '@openmsupply-client/common';
import { SupportedLocales } from '@openmsupply-client/common/src/intl/intlHelpers';
import { BrowserRouter } from 'react-router-dom';

export default {
  title: 'Host/AppDrawer',
  component: AppDrawer,
} as ComponentMeta<typeof AppDrawer>;

interface AppDrawerStoryArgs {
  locale: SupportedLocales;
}

const Template: Story<AppDrawerStoryArgs> = args => (
  <TestingProvider {...args}>
    <BrowserRouter>
      <AppDrawer />
    </BrowserRouter>
  </TestingProvider>
);

export const English = Template.bind({});
English.args = 'en';

export const French = Template.bind({});
French.args = {
  locale: 'fr',
};

export const Portuguese = Template.bind({});
Portuguese.args = {
  locale: 'pt',
};

export const Arabic = Template.bind({});
Arabic.args = {
  locale: 'ar',
};
