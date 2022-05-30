import React from 'react';
import '@fontsource/inter/variable.css';
// import "@fontsource/inter/variable-italic.css"; // Italic variant: not currently used
import { CssBaseline } from '@mui/material';
import { addDecorator } from '@storybook/react';
import { initializeWorker, mswDecorator } from 'msw-storybook-addon';
import { StoryProvider, TestingRouterContext } from '@common/utils';

initializeWorker();
addDecorator(mswDecorator);

export const decorators = [
  Story => (
    <StoryProvider>
      <TestingRouterContext>
        <CssBaseline />
        <Story />
      </TestingRouterContext>
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
