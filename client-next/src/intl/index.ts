import type { ParseKeys } from 'i18next';

// The app's translation surface. Import from here, not 'react-i18next' directly,
// so the i18n instance is guaranteed initialised and keys stay typed.
export { useTranslation, Trans } from 'react-i18next';

/** Union of every valid translation key (typed from the locale JSON). */
export type TxKey = ParseKeys;
