import { gqlClient } from '@/api/gqlClient';
import { getSdk } from './invoices.generated';

export const invoicesSdk = getSdk(gqlClient);
