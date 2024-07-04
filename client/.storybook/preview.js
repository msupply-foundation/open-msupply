import React from 'react';
import '@fontsource-variable/inter';
import { CssBaseline } from '@mui/material';
import { StoryProvider, TestingRouterContext } from '@common/utils';

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
    expanded: true, // Adds the description and default columns
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};
