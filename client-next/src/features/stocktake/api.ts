import { gqlClient } from '@/api/gqlClient';
import { getSdk } from './stocktake.generated';

export const stocktakeSdk = getSdk(gqlClient);
