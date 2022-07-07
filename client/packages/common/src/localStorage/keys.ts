import { SupportedLocales } from '@common/intl';
import { ThemeOptions } from '@mui/material';
import { UserStoreNodeFragment } from '../authentication/api/operations.generated';
import { AuthError } from '../authentication/AuthContext';

export type GroupByItem = {
  outboundShipment?: boolean;
  inboundShipment?: boolean;
  stocktake?: boolean;
};
type AuthenticationCredentials = {
  store?: UserStoreNodeFragment | undefined;
  username: string;
};

export type LocalStorageRecord = {
  '/appdrawer/open': boolean;
  '/detailpanel/open': boolean;
  '/localisation/locale': SupportedLocales;
  '/groupbyitem': GroupByItem;
  '/theme/custom': ThemeOptions;
  '/theme/logo': string;
  '/mru/credentials': AuthenticationCredentials;
  '/auth/error': AuthError | undefined;
  '/columns/hidden': Record<string, string[]> | undefined;
};

export type LocalStorageKey = keyof LocalStorageRecord;
