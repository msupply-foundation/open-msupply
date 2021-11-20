import React from 'react';
import { Story, ComponentMeta } from '@storybook/react';
import AppDrawer from './AppDrawer';
import { StoryProvider } from '@openmsupply-client/common';
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
  <StoryProvider {...args}>
    <BrowserRouter>
      <AppDrawer />
    </BrowserRouter>
  </StoryProvider>
);

export const English = Template.bind({});
English.args = 'en';

export const French = Template.bind({});
French.args = {
  locale: 'fr',
};

export const Arabic = Template.bind({});
Arabic.args = {
  locale: 'ar',
};
