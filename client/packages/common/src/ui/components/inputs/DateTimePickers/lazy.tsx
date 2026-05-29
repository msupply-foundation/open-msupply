import React, { ComponentProps, lazy, Suspense } from 'react';
import type {
  DatePicker as DatePickerImpl,
  DateTimePicker as DateTimePickerImpl,
} from '@mui/x-date-pickers';

// Lazy boundaries for the raw MUI pickers. By dynamic-importing them from
// here, the rest of `@openmsupply-client/common` doesn't pull
// `@mui/x-date-pickers` (~400KB) into the eager federation-shared bundle.
const LazyDatePicker = lazy(() =>
  import('@mui/x-date-pickers/DatePicker').then(m => ({ default: m.DatePicker }))
);

const LazyDateTimePicker = lazy(() =>
  import('@mui/x-date-pickers/DateTimePicker').then(m => ({
    default: m.DateTimePicker,
  }))
);

export const DatePicker = (props: ComponentProps<typeof DatePickerImpl>) => (
  <Suspense fallback={null}>
    <LazyDatePicker {...props} />
  </Suspense>
);

export const DateTimePicker = (
  props: ComponentProps<typeof DateTimePickerImpl>
) => (
  <Suspense fallback={null}>
    <LazyDateTimePicker {...props} />
  </Suspense>
);
