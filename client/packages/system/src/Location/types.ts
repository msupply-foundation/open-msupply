import { LocationNode } from '@openmsupply-client/common';

export type Location = Omit<LocationNode, '__typename' | 'stock'>;
