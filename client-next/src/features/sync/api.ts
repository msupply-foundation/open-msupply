import { gqlClient } from '@/api/gqlClient';
import { getSdk } from './sync.generated';

export const syncSdk = getSdk(gqlClient);
