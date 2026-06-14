import * as Types from '../../gql/schema';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type ItemOptionFragment = {
  __typename: 'ItemNode';
  id: string;
  code: string;
  name: string;
  unitName?: string | null;
  defaultPackSize: number;
  isVaccine: boolean;
  doses: number;
};

export type ItemsSearchQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  filter?: Types.InputMaybe<Types.ItemFilterInput>;
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
}>;

export type ItemsSearchQuery = {
  __typename: 'Queries';
  items: {
    __typename: 'ItemConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'ItemNode';
      id: string;
      code: string;
      name: string;
      unitName?: string | null;
      defaultPackSize: number;
      isVaccine: boolean;
      doses: number;
    }>;
  };
};

export const ItemOptionFragmentDoc = gql`
  fragment ItemOption on ItemNode {
    __typename
    id
    code
    name
    unitName
    defaultPackSize
    isVaccine
    doses
  }
`;
export const ItemsSearchDocument = gql`
  query itemsSearch($storeId: String!, $filter: ItemFilterInput, $first: Int) {
    items(storeId: $storeId, filter: $filter, page: { first: $first }) {
      ... on ItemConnector {
        __typename
        totalCount
        nodes {
          ...ItemOption
        }
      }
    }
  }
  ${ItemOptionFragmentDoc}
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string,
  variables?: any,
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (
  action,
  _operationName,
  _operationType,
  _variables,
) => action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper,
) {
  return {
    itemsSearch(
      variables: ItemsSearchQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<ItemsSearchQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ItemsSearchQuery>({
            document: ItemsSearchDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'itemsSearch',
        'query',
        variables,
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
