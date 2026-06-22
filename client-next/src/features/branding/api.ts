import { gqlClient } from '@/api/gqlClient';
import { getSdk } from './branding.generated';

export const brandingSdk = getSdk(gqlClient);
