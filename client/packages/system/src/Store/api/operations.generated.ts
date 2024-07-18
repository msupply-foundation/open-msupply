import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type StoreRowFragment = { __typename: 'StoreNode', code: string, id: string };

export type StoresQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  filter?: Types.InputMaybe<Types.StoreFilterInput>;
}>;


export type StoresQuery = { __typename: 'Queries', stores: { __typename: 'StoreConnector', totalCount: number, nodes: Array<{ __typename: 'StoreNode', code: string, id: string }> } };

export const StoreRowFragmentDoc = gql`
    fragment StoreRow on StoreNode {
  code
  id
}
    `;
export const StoresDocument = gql`
    query stores($first: Int, $offset: Int, $filter: StoreFilterInput) {
  stores(
    page: {first: $first, offset: $offset}
    filter: $filter
    sort: {key: name}
  ) {
    ... on StoreConnector {
      __typename
      totalCount
      nodes {
        ...StoreRow
      }
    }
  }
}
    ${StoreRowFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    stores(variables?: StoresQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<StoresQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<StoresQuery>(StoresDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'stores', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;