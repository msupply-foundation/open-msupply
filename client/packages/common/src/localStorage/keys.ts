import { NativeMode } from '@common/hooks';
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
  '/localisation/locale': Record<string, SupportedLocales>;
  '/groupbyitem': GroupByItem;
  '/theme/custom': ThemeOptions;
  '/theme/customhash': string;
  '/theme/logo': string;
  '/theme/logohash': string;
  '/mru/credentials': AuthenticationCredentials;
  '/auth/error': AuthError | undefined;
  '/pagination/rowsperpage': number;
  '/columns/hidden': Record<string, string[]> | undefined;
  '/native/mode': NativeMode | null;
};

export type LocalStorageKey = keyof LocalStorageRecord;
