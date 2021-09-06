import React from 'react';

import AppThemeProvider from '../packages/common/src/styles/ThemeProvider';
import { IntlProvider } from '../packages/common/src/intl/IntlProvider';
import { CssBaseline } from '@material-ui/core';

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
