import { GraphQLClient } from 'graphql-request';
import { getSdk } from '..';

export * from './context';

export const createOmSupplyApi = (url: string): OmSupplyApi =>
  getSdk(new GraphQLClient(url));

export type OmSupplyApi = ReturnType<typeof getSdk>;
