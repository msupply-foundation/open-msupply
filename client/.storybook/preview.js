import React from 'react';
import { CssBaseline } from '@material-ui/core';
import { addDecorator } from '@storybook/react';
import { initializeWorker, mswDecorator } from 'msw-storybook-addon';

import { TestingProvider } from '../packages/common/src/utils/testing';

initializeWorker();
addDecorator(mswDecorator);

export const decorators = [
  Story => (
    <TestingProvider>
      <CssBaseline />
      <Story />
    </TestingProvider>
  ),
];

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};
