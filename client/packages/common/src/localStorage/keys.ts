import { SupportedLocales } from '@common/intl';

export type LocalStorageRecord = {
  '/appdrawer/open': boolean;
  '/localisation/locale': SupportedLocales;
};

export type LocalStorageKey = keyof LocalStorageRecord;
