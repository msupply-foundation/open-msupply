import { gqlClient } from '@/api/gqlClient';
import { getSdk } from './stock.generated';

export const stockSdk = getSdk(gqlClient);
