import { gqlClient } from '@/api/gqlClient';
import { getSdk } from './auth.generated';

export const authSdk = getSdk(gqlClient);
