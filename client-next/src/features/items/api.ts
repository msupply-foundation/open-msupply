import { gqlClient } from '@/api/gqlClient';
import { getSdk } from './items.generated';

export const itemsSdk = getSdk(gqlClient);
