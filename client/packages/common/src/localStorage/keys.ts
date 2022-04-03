import { SupportedLocales } from '@common/intl';
import { ThemeOptions } from '@mui/material';
import { AuthError } from '../authentication/AuthContext';

export type GroupByItem = {
  outboundShipment?: boolean;
  inboundShipment?: boolean;
};
type AuthenticationCredentials = {
  store?: { id: string; code: string; __typename: 'StoreNode' } | undefined;
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
};

export type LocalStorageKey = keyof LocalStorageRecord;
