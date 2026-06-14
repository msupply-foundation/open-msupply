import { gqlClient } from '@/api/gqlClient';
import { getSdk } from './names.generated';

export const namesSdk = getSdk(gqlClient);
