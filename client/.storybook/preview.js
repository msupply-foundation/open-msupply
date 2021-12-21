import '@fontsource/inter/variable.css';
// import "@fontsource/inter/variable-italic.css"; // Italic variant: not currently used
import React from 'react';
import { CssBaseline } from '@mui/material';
import { addDecorator } from '@storybook/react';
import { initializeWorker, mswDecorator } from 'msw-storybook-addon';

import { StoryProvider } from '../packages/common/src/utils/testing';

initializeWorker();
addDecorator(mswDecorator);

export const decorators = [
  Story => (
    <StoryProvider>
      <CssBaseline />
      <Story />
    </StoryProvider>
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
