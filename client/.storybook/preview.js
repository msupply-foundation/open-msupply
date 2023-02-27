import React from 'react';
import '@fontsource/inter/variable.css';
// import "@fontsource/inter/variable-italic.css"; // Italic variant: not currently used
import { CssBaseline } from '@mui/material';
import { initializeWorker, mswDecorator } from 'msw-storybook-addon';
import { StoryProvider, TestingRouterContext } from '@common/utils';

initializeWorker();

export const decorators = [
  mswDecorator,
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
    expanded: true, // Adds the description and default columns
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};
