import React, { ComponentProps, lazy, Suspense } from 'react';
import type { ExpiryDateInput as ExpiryDateInputImpl } from './ExpiryDateInput';

const Lazy = lazy(() =>
  import('./ExpiryDateInput').then(m => ({ default: m.ExpiryDateInput }))
);

export const ExpiryDateInput = (
  props: ComponentProps<typeof ExpiryDateInputImpl>
) => (
  <Suspense fallback={null}>
    <Lazy {...props} />
  </Suspense>
);
