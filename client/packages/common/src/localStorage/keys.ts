import { SupportedLocales } from '@common/intl';
import { ThemeOptions } from '@mui/material';

export type GroupByItem = {
  outboundShipment?: boolean;
  inboundShipment?: boolean;
};
export type LocalStorageRecord = {
  '/appdrawer/open': boolean;
  '/detailpanel/open': boolean;
  '/localisation/locale': SupportedLocales;
  '/groupbyitem': GroupByItem;
  '/theme/custom': ThemeOptions;
  '/theme/logo': string;
};

export type LocalStorageKey = keyof LocalStorageRecord;
