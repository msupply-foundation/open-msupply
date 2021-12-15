import { SupportedLocales } from '@common/intl';

export type LocalStorageRecord = {
  '/appdrawer/open': boolean;
  '/localisation/locale': SupportedLocales;
  '/outboundshipment/groupbyitem': boolean;
};

export type LocalStorageKey = keyof LocalStorageRecord;
