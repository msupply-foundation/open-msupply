import 'react-i18next';
import type { defaultNS, resources } from './i18n';

// Makes t('…') keys autocomplete and a missing/typo'd key a compile error —
// the locale JSON is the single source of truth for what keys exist.
declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)['en'];
  }
}
