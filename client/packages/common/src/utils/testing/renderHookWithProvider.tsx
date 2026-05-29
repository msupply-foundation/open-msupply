import React from 'react';
import { renderHook } from '@testing-library/react';
import { SupportedLocales } from '@common/intl';
import { TestingProvider } from './testing';

// Lives in its own file (rather than testing.tsx) so the static
// @testing-library/react import doesn't get pulled into the production
// bundle through `@openmsupply-client/common`'s module-federation surface.
// Tests import this via the relative path or the `@common/testing` alias —
// never through the common package barrel.
export const renderHookWithProvider = <Props, Result>(
  hook: (props: Props) => Result,
  options?: {
    providerProps?: { locale: SupportedLocales };
  }
) =>
  renderHook(hook, {
    wrapper: ({ children }: { children?: React.ReactNode }) => (
      <TestingProvider {...options?.providerProps}>{children}</TestingProvider>
    ),
  });
