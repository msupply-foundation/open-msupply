import React, { ComponentProps, lazy, Suspense } from 'react';
import type { TimePickerInput as TimePickerInputImpl } from './TimePickerInput';

const Lazy = lazy(() =>
  import('./TimePickerInput').then(m => ({ default: m.TimePickerInput }))
);

export const TimePickerInput = (
  props: ComponentProps<typeof TimePickerInputImpl>
) => (
  <Suspense fallback={null}>
    <Lazy {...props} />
  </Suspense>
);
