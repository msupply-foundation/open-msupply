import { GraphQLClient } from 'graphql-request';
import { getSdk } from '..';

export * from './OmSupplyApiContext';

export const createOmSupplyApi = (
  url: string
): { api: OmSupplyApi; client: GraphQLClient } => {
  const client = new GraphQLClient(url);
  const api = getSdk(client);
  return { client, api };
};

export type OmSupplyApi = ReturnType<typeof getSdk>;
