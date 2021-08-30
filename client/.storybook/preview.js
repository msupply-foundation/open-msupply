import React from 'react';

import AppThemeProvider from '../packages/common/src/styles/ThemeProvider';
import { IntlProvider } from '../packages/common/src/intl/IntlProvider';

export const decorators = [
  Story => (
    <IntlProvider locale="en">
      <AppThemeProvider>
        <Story />
      </AppThemeProvider>
    </IntlProvider>
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
