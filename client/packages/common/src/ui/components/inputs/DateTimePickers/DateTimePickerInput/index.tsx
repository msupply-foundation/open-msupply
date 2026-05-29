import React, { ComponentProps, lazy, Suspense } from 'react';
import type { DateTimePickerInput as DateTimePickerInputImpl } from './DateTimePickerInput';

// Lazy boundary: `DateTimePickerInput` pulls in `@mui/x-date-pickers` (~400KB
// gzipped library). Loading the real component on demand keeps that weight
// out of the eager federation-shared bundle.
const Lazy = lazy(() =>
  import('./DateTimePickerInput').then(m => ({ default: m.DateTimePickerInput }))
);

export const DateTimePickerInput = (
  props: ComponentProps<typeof DateTimePickerInputImpl>
) => (
  <Suspense fallback={null}>
    <Lazy {...props} />
  </Suspense>
);
