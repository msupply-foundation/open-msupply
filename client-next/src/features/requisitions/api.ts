import { gqlClient } from '@/api/gqlClient';
import { getSdk } from './requisitions.generated';

export const requisitionsSdk = getSdk(gqlClient);
